import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asService,
  asUser,
  bookConfirmed,
  connect,
  createOffer,
  createStaff,
  limaDate,
  limaInstant,
  newSession,
  rpc,
  setBookingMode,
  sha256,
  uid,
  verifiedSession,
} from "./helpers";

type HoldResult = { ok: boolean; code?: string; hold?: { appointment_id: string; ends_at: string; hold_expires_at: string } };
type ConfirmResult = { ok: boolean; code?: string; replayed?: boolean; appointment?: { appointment_id: string; status: string } };

let admin: pg.Client;
let previousMode: "off" | "reception" | "automatic";
let service: pg.Client;
const day = limaDate(3);

beforeAll(async () => {
  admin = await connect();
  service = await connect();
  previousMode = (await admin.query("select booking_mode from public.clinic_settings_public where id")).rows[0].booking_mode;
  await setBookingMode(admin, "automatic");
});

afterAll(async () => {
  // Restaurar el modo previo: no dejar la base de desarrollo en un estado distinto al encontrado.
  await setBookingMode(admin, previousMode);
  await admin.end();
  await service.end();
});

async function hold(c: pg.Client, session: string, fx: { serviceId: string; doctorId: string }, at: string) {
  return asService(c, (x) => rpc<HoldResult>(x, "booking_create_hold", [session, fx.serviceId, fx.doctorId, at]));
}

async function slots(fx: { serviceId: string; doctorId: string | null }, date = day) {
  const { rows } = await asService(service, (c) =>
    c.query("select starts_at from public.booking_slots($1, $2, $3, $3)", [fx.serviceId, fx.doctorId, date]),
  );
  return rows.map((r) => (r.starts_at as Date).toISOString());
}

describe("disponibilidad calculada en base de datos", () => {
  it("genera horarios según reglas, duración e intervalo y en hora de Lima", async () => {
    const fx = await createOffer(admin, { duration: 60, interval: 30 });
    const list = await slots(fx);
    expect(list[0]).toBe(limaInstant(day, "08:00"));
    // Última cita de 60 min que cabe antes de las 20:00 → 19:00.
    expect(list.at(-1)).toBe(limaInstant(day, "19:00"));
    expect(list).toHaveLength(23);
  });

  it("no ofrece fechas pasadas ni horas dentro de la antelación mínima", async () => {
    const fx = await createOffer(admin);
    expect(await slots(fx, limaDate(-1))).toHaveLength(0);
    const today = await slots(fx, limaDate(0));
    const minNotice = Date.now() + 120 * 60_000;
    expect(today.every((s) => new Date(s).getTime() >= minNotice)).toBe(true);
    const session = await newSession(service);
    const past = await hold(service, session, fx, limaInstant(limaDate(-1), "10:00"));
    expect(past).toMatchObject({ ok: false, code: "slot_unavailable" });
  });

  it("respeta feriados de sede y bloqueos del profesional", async () => {
    const fx = await createOffer(admin);
    const holiday = limaDate(4);
    await admin.query(
      `insert into public.schedule_exceptions (doctor_id, kind, period) values (null, 'holiday', tstzrange($1, $2, '[)'))`,
      [limaInstant(holiday, "00:00"), limaInstant(limaDate(5), "00:00")],
    );
    expect(await slots(fx, holiday)).toHaveLength(0);

    await admin.query(
      `insert into public.schedule_exceptions (doctor_id, kind, period) values ($1, 'block', tstzrange($2, $3, '[)'))`,
      [fx.doctorId, limaInstant(day, "10:00"), limaInstant(day, "11:00")],
    );
    const list = await slots(fx);
    expect(list).not.toContain(limaInstant(day, "10:00"));
    expect(list).not.toContain(limaInstant(day, "10:30"));
    expect(list).toContain(limaInstant(day, "11:00"));
    const session = await newSession(service);
    expect(await hold(service, session, fx, limaInstant(day, "10:30"))).toMatchObject({ ok: false, code: "slot_unavailable" });
    // Limpieza del feriado global para no afectar otras pruebas.
    await admin.query(`delete from public.schedule_exceptions where doctor_id is null and kind = 'holiday'`);
  });

  it("profesional inactivo no tiene disponibilidad ni acepta retenciones", async () => {
    const fx = await createOffer(admin);
    await admin.query("update public.doctors set active = false where id = $1", [fx.doctorId]);
    expect(await slots(fx)).toHaveLength(0);
    const session = await newSession(service);
    expect(await hold(service, session, fx, limaInstant(day, "09:00"))).toMatchObject({ ok: false, code: "slot_unavailable" });
  });

  it("con reservas web apagadas no se crean retenciones", async () => {
    const fx = await createOffer(admin);
    await setBookingMode(admin, "off");
    try {
      const session = await newSession(service);
      expect(await hold(service, session, fx, limaInstant(day, "09:00"))).toMatchObject({ ok: false, code: "booking_disabled" });
    } finally {
      await setBookingMode(admin, "automatic");
    }
  });
});

describe("prevención de cruces", () => {
  it("dos reservas concurrentes del mismo horario: sólo una gana", async () => {
    const fx = await createOffer(admin);
    const at = limaInstant(day, "09:00");
    const [c1, c2] = [await connect(), await connect()];
    try {
      const [s1, s2] = [await newSession(c1), await newSession(c2)];
      const results = await Promise.all([hold(c1, s1, fx, at), hold(c2, s2, fx, at)]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.find((r) => !r.ok)?.code).toMatch(/slot_taken|slot_unavailable/);
    } finally {
      await c1.end();
      await c2.end();
    }
  });

  it("intervalos distintos que se solapan (10:00–11:00 y 10:30–11:30): sólo uno gana, también en paralelo", async () => {
    const fx = await createOffer(admin, { duration: 60, interval: 30 });
    const clients = await Promise.all(Array.from({ length: 6 }, () => connect()));
    try {
      const sessions = await Promise.all(clients.map((c) => newSession(c)));
      const times = ["10:00", "10:30", "10:00", "10:30", "10:00", "10:30"];
      const results = await Promise.all(
        clients.map((c, i) => hold(c, sessions[i]!, fx, limaInstant(day, times[i]!))),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      const { rows } = await admin.query(
        "select count(*)::int as n from public.appointments where doctor_id = $1 and blocks_capacity",
        [fx.doctorId],
      );
      expect(rows[0].n).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("estrés: 12 conexiones simultáneas sobre el mismo horario → 1 gana, 11 códigos limpios, 0 errores (sin deadlocks)", async () => {
    const fx = await createOffer(admin, { duration: 45, interval: 15, bufferAfter: 10 });
    const clients = await Promise.all(Array.from({ length: 12 }, () => connect()));
    try {
      const sessions = await Promise.all(clients.map((c) => newSession(c)));
      const times = ["09:00", "09:15", "09:30", "09:00"];
      const settled = await Promise.allSettled(
        clients.map((c, i) => hold(c, sessions[i]!, fx, limaInstant(day, times[i % times.length]!))),
      );
      expect(settled.filter((r) => r.status === "rejected")).toEqual([]);
      const results = settled.map((r) => (r as PromiseFulfilledResult<HoldResult>).value);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok).every((r) => r.code === "slot_taken" || r.code === "slot_unavailable")).toBe(true);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("los buffers bloquean horarios adyacentes", async () => {
    const fx = await createOffer(admin, { duration: 30, interval: 30, bufferAfter: 15 });
    await bookConfirmed(service, fx, limaInstant(day, "12:00"));
    const list = await slots(fx);
    // 12:30 queda ocupado por el buffer posterior (12:30–12:45).
    expect(list).not.toContain(limaInstant(day, "12:30"));
    expect(list).toContain(limaInstant(day, "13:00"));
  });

  it("la duración y el fin los decide el servidor con la configuración vigente", async () => {
    const fx = await createOffer(admin, { duration: 30 });
    await admin.query("update public.doctor_services set duration_minutes = 45 where doctor_id = $1", [fx.doctorId]);
    const session = await newSession(service);
    const r = await hold(service, session, fx, limaInstant(day, "14:00"));
    expect(r.ok).toBe(true);
    expect(r.hold?.ends_at).toBeDefined();
    expect(new Date(r.hold!.ends_at).toISOString()).toBe(limaInstant(day, "14:45"));
  });

  it("recepción y web compiten por la misma capacidad", async () => {
    const fx = await createOffer(admin);
    const desk = await createStaff(admin, ["reception"]);
    const at = limaInstant(day, "15:00");
    const [c1, c2] = [await connect(), await connect()];
    try {
      const session = await newSession(c1);
      const [web, staff] = await Promise.all([
        hold(c1, session, fx, at),
        asUser(c2, desk, "aal2", (c) =>
          rpc<{ ok: boolean; code?: string }>(c, "staff_create_appointment", [
            fx.serviceId, fx.doctorId, at, "Paciente Telefónica", "+51999000222", null, "phone", true, false, null,
          ]),
        ),
      ]);
      expect([web.ok, staff.ok].filter(Boolean)).toHaveLength(1);
    } finally {
      await c1.end();
      await c2.end();
    }
  });

  it("recursos compartidos: dos profesionales no usan el mismo equipo a la vez", async () => {
    const a = await createOffer(admin);
    const b = await createOffer(admin);
    const r = await admin.query("insert into public.resources (name, kind) values ($1, 'equipment') returning id", [
      `Equipo ficticio ${uid().slice(0, 8)}`,
    ]);
    await admin.query("insert into public.service_resources (service_id, resource_id) values ($1, $3), ($2, $3)", [
      a.serviceId, b.serviceId, r.rows[0].id,
    ]);
    const at = limaInstant(day, "16:00");
    const first = await bookConfirmed(service, a, at);
    const session = await newSession(service);
    expect(await hold(service, session, b, at)).toMatchObject({ ok: false });
    // Cancelar libera también el recurso.
    const desk = await createStaff(admin, ["reception"]);
    await asUser(service, desk, "aal2", (c) =>
      rpc(c, "staff_transition_appointment", [first.appointmentId, "cancelled", "other", false]),
    );
    expect(await hold(service, session, b, at)).toMatchObject({ ok: true });
  });
});

describe("retenciones e idempotencia", () => {
  it("un hold vencido no bloquea y no se puede confirmar", async () => {
    const fx = await createOffer(admin);
    const at = limaInstant(day, "09:30");
    const { hash } = await verifiedSession(service);
    const h = await hold(service, hash, fx, at);
    expect(h.ok).toBe(true);
    await admin.query("update public.appointments set hold_expires_at = now() - interval '1 second' where id = $1", [
      h.hold!.appointment_id,
    ]);
    // Otra persona puede tomar el horario: la limpieza ocurre dentro de su transacción.
    const other = await newSession(service);
    expect(await hold(service, other, fx, at)).toMatchObject({ ok: true });
    const confirm = await asService(service, (c) =>
      rpc<ConfirmResult>(c, "booking_confirm", [hash, h.hold!.appointment_id, uid(), "v-prueba", false]),
    );
    expect(confirm).toMatchObject({ ok: false, code: "hold_expired" });
  });

  it("doble clic al retener devuelve la misma retención", async () => {
    const fx = await createOffer(admin);
    const at = limaInstant(day, "11:00");
    const session = await newSession(service);
    const [c1, c2] = [await connect(), await connect()];
    try {
      const [r1, r2] = await Promise.all([hold(c1, session, fx, at), hold(c2, session, fx, at)]);
      expect(r1.ok && r2.ok).toBe(true);
      expect(r1.hold!.appointment_id).toBe(r2.hold!.appointment_id);
    } finally {
      await c1.end();
      await c2.end();
    }
  });

  it("confirmar exige contacto verificado", async () => {
    const fx = await createOffer(admin);
    const session = await newSession(service);
    const h = await hold(service, session, fx, limaInstant(day, "17:00"));
    const r = await asService(service, (c) =>
      rpc<ConfirmResult>(c, "booking_confirm", [session, h.hold!.appointment_id, uid(), "v-prueba", false]),
    );
    expect(r).toMatchObject({ ok: false, code: "contact_unverified" });
  });

  it("el código de verificación tiene intentos limitados", async () => {
    const session = await newSession(service);
    const good = sha256(`${session}:654321`);
    await asService(service, (c) =>
      rpc(c, "booking_start_verification", [session, "Paciente Ficticia", "limite@example.test", null, good]),
    );
    for (let i = 0; i < 5; i++) {
      const r = await asService(service, (c) => rpc<{ ok: boolean; code: string }>(c, "booking_verify_code", [session, sha256("x" + i)]));
      expect(r.code).toBe("code_invalid");
    }
    const blocked = await asService(service, (c) => rpc<{ ok: boolean; code: string }>(c, "booking_verify_code", [session, good]));
    expect(blocked).toMatchObject({ ok: false, code: "too_many_attempts" });
  });

  it("reintentos con la misma clave (incluso concurrentes) producen una sola cita", async () => {
    const fx = await createOffer(admin);
    const { hash } = await verifiedSession(service);
    const h = await hold(service, hash, fx, limaInstant(day, "18:00"));
    const key = uid();
    const [c1, c2] = [await connect(), await connect()];
    try {
      const results = await Promise.all(
        [c1, c2].map((c) =>
          asService(c, (x) => rpc<ConfirmResult>(x, "booking_confirm", [hash, h.hold!.appointment_id, key, "v-prueba", true])),
        ),
      );
      expect(results.every((r) => r.ok)).toBe(true);
      expect(results.filter((r) => r.replayed)).toHaveLength(1);
      const replay = await asService(service, (c) =>
        rpc<ConfirmResult>(c, "booking_confirm", [hash, h.hold!.appointment_id, key, "v-prueba", true]),
      );
      expect(replay).toMatchObject({ ok: true, replayed: true });
      const result = await asService(service, (c) => rpc<ConfirmResult>(c, "booking_result", [hash, key]));
      expect(result.appointment?.status).toBe("confirmed");
      const consents = await admin.query(
        "select purpose, granted from public.consent_records where appointment_id = $1 order by purpose",
        [h.hold!.appointment_id],
      );
      expect(consents.rows).toEqual([
        { purpose: "booking_privacy", granted: true },
        { purpose: "marketing", granted: true },
      ]);
    } finally {
      await c1.end();
      await c2.end();
    }
  });

  it("modo recepción: queda pendiente de confirmación con vencimiento operativo", async () => {
    const fx = await createOffer(admin);
    await setBookingMode(admin, "reception");
    try {
      const { hash } = await verifiedSession(service);
      const h = await hold(service, hash, fx, limaInstant(day, "19:00"));
      const r = await asService(service, (c) =>
        rpc<ConfirmResult & { appointment: { pending_expires_at: string } }>(c, "booking_confirm", [
          hash, h.hold!.appointment_id, uid(), "v-prueba", false,
        ]),
      );
      expect(r.appointment?.status).toBe("pending_confirmation");
      expect(r.appointment?.pending_expires_at).toBeTruthy();
      // Vencida, el job la expira y libera el cupo.
      await admin.query("update public.appointments set pending_expires_at = now() - interval '1 second' where id = $1", [
        h.hold!.appointment_id,
      ]);
      await asService(service, (c) => rpc(c, "jobs_maintenance", []));
      const { rows } = await admin.query("select status from public.appointments where id = $1", [h.hold!.appointment_id]);
      expect(rows[0].status).toBe("expired");
    } finally {
      await setBookingMode(admin, "automatic");
    }
  });
});

describe("cambios de estado, reprogramación y cancelación", () => {
  it("cancelar libera el cupo", async () => {
    const fx = await createOffer(admin);
    const at = limaInstant(day, "08:30");
    const booked = await bookConfirmed(service, fx, at);
    expect(await slots(fx)).not.toContain(at);
    const desk = await createStaff(admin, ["reception"]);
    const r = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean }>(c, "staff_transition_appointment", [booked.appointmentId, "cancelled", "patient_request", false]),
    );
    expect(r.ok).toBe(true);
    expect(await slots(fx)).toContain(at);
  });

  it("reprogramación fallida conserva la cita original; la exitosa libera el origen", async () => {
    const fx = await createOffer(admin);
    const desk = await createStaff(admin, ["reception"]);
    const original = await bookConfirmed(service, fx, limaInstant(day, "09:00"));
    await bookConfirmed(service, fx, limaInstant(day, "10:00"));

    const fail = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean; code: string }>(c, "staff_reschedule_appointment", [original.appointmentId, fx.doctorId, limaInstant(day, "10:00"), false]),
    );
    expect(fail.ok).toBe(false);
    const { rows } = await admin.query("select starts_at, status, version from public.appointments where id = $1", [original.appointmentId]);
    expect((rows[0].starts_at as Date).toISOString()).toBe(limaInstant(day, "09:00"));
    expect(rows[0].status).toBe("confirmed");

    // Mover 30 min dentro de su propio intervalo (se solapa consigo misma) debe funcionar.
    const ok = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean }>(c, "staff_reschedule_appointment", [original.appointmentId, fx.doctorId, limaInstant(day, "09:30"), false]),
    );
    expect(ok.ok).toBe(true);
    expect(await slots(fx)).toContain(limaInstant(day, "09:00"));
  });

  it("recepción no confirma una cita expirada si el cupo ya fue tomado", async () => {
    const fx = await createOffer(admin);
    const desk = await createStaff(admin, ["reception"]);
    await setBookingMode(admin, "reception");
    let pendingId: string;
    try {
      const { hash } = await verifiedSession(service);
      const h = await hold(service, hash, fx, limaInstant(day, "13:00"));
      const r = await asService(service, (c) =>
        rpc<ConfirmResult>(c, "booking_confirm", [hash, h.hold!.appointment_id, uid(), "v", false]),
      );
      pendingId = r.appointment!.appointment_id;
    } finally {
      await setBookingMode(admin, "automatic");
    }
    await admin.query("update public.appointments set pending_expires_at = now() - interval '1 second' where id = $1", [pendingId]);
    await bookConfirmed(service, fx, limaInstant(day, "13:00"));
    const res = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean; code: string }>(c, "staff_transition_appointment", [pendingId, "confirmed", null, false]),
    );
    expect(res.ok).toBe(false);
    expect(res.code).toMatch(/slot_unavailable|slot_taken|invalid_transition/);
  });

  it("no se marca asistencia de una cita futura y las transiciones inválidas se rechazan", async () => {
    const fx = await createOffer(admin);
    const desk = await createStaff(admin, ["reception"]);
    const booked = await bookConfirmed(service, fx, limaInstant(day, "11:30"));
    const early = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean; code: string }>(c, "staff_transition_appointment", [booked.appointmentId, "completed", null, false]),
    );
    expect(early).toMatchObject({ ok: false, code: "not_started" });
    const bad = await asUser(service, desk, "aal2", (c) =>
      rpc<{ ok: boolean; code: string }>(c, "staff_transition_appointment", [booked.appointmentId, "expired", null, false]),
    );
    expect(bad).toMatchObject({ ok: false, code: "invalid_transition" });
  });
});
