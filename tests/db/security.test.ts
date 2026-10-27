import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asService,
  asUser,
  bookConfirmed,
  connect,
  createOffer,
  createStaff,
  createUser,
  limaDate,
  limaInstant,
  newToken,
  rpc,
  setBookingMode,
  sha256,
  uid,
} from "./helpers";

let admin: pg.Client;
let service: pg.Client;
let user: pg.Client;
const day = limaDate(6);

beforeAll(async () => {
  admin = await connect();
  service = await connect();
  user = await connect();
  await setBookingMode(admin, "automatic");
});

afterAll(async () => {
  await setBookingMode(admin, "off");
  await Promise.all([admin.end(), service.end(), user.end()]);
});

const expectDenied = (p: Promise<unknown>) => expect(p).rejects.toThrow(/permission denied|forbidden|mfa_required/);

describe("RLS y permisos por rol", () => {
  it("anónimo no lee contactos, citas, sesiones ni outbox, y no ejecuta funciones de reserva", async () => {
    await bookConfirmed(service, await createOffer(admin), limaInstant(day, "09:00"));
    for (const table of ["contacts", "appointments", "notification_outbox", "consent_records", "staff_roles", "audit_log"]) {
      await expectDenied(asAnon(user, (c) => c.query(`select * from public.${table} limit 1`)));
    }
    await expectDenied(asAnon(user, (c) => c.query("select * from private.booking_sessions limit 1")));
    await expectDenied(asAnon(user, (c) => c.query("select public.booking_create_hold('x', null, null, now())")));
    await expectDenied(asAnon(user, (c) => c.query("select public.manage_overview('x')")));
    // Lo público sí es legible.
    const pub = await asAnon(user, (c) => c.query("select count(*)::int as n from public.published_content"));
    expect(pub.rows[0].n).toBeGreaterThan(0);
  });

  it("anónimo no puede escribir contenido publicado ni configuración", async () => {
    await expectDenied(asAnon(user, (c) => c.query("update public.clinic_settings_public set clinic_name = 'X'")));
    await expectDenied(asAnon(user, (c) => c.query("delete from public.published_content")));
  });

  it("editor no lee citas ni contactos", async () => {
    await bookConfirmed(service, await createOffer(admin), limaInstant(day, "10:00"));
    const editor = await createStaff(admin, ["editor"]);
    const appts = await asUser(user, editor, "aal2", (c) => c.query("select id from public.appointments"));
    expect(appts.rowCount).toBe(0);
    const contacts = await asUser(user, editor, "aal2", (c) => c.query("select id from public.contacts"));
    expect(contacts.rowCount).toBe(0);
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("select * from public.staff_slots(null, null, current_date, current_date)")));
  });

  it("recepción sin MFA (aal1) no ve citas; con MFA sí", async () => {
    await bookConfirmed(service, await createOffer(admin), limaInstant(day, "11:00"));
    const desk = await createStaff(admin, ["reception"]);
    const aal1 = await asUser(user, desk, "aal1", (c) => c.query("select id from public.appointments"));
    expect(aal1.rowCount).toBe(0);
    const aal2 = await asUser(user, desk, "aal2", (c) => c.query("select id from public.appointments"));
    expect(aal2.rowCount).toBeGreaterThan(0);
    await expect(
      asUser(user, desk, "aal1", (c) => c.query("select * from public.staff_slots(null, null, current_date, current_date)")),
    ).rejects.toThrow(/mfa_required/);
  });

  it("profesional sólo lee su propia agenda y sus contactos", async () => {
    const mine = await createOffer(admin);
    const other = await createOffer(admin);
    await bookConfirmed(service, mine, limaInstant(day, "12:00"));
    await bookConfirmed(service, other, limaInstant(day, "12:00"));
    const pro = await createStaff(admin, ["professional"], { doctorId: mine.doctorId });
    const { rows } = await asUser(user, pro, "aal2", (c) => c.query("select doctor_id, contact_id from public.appointments"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.doctor_id === mine.doctorId)).toBe(true);
    const contacts = await asUser(user, pro, "aal2", (c) => c.query("select id from public.contacts"));
    expect(contacts.rows.map((r) => r.id).sort()).toEqual([...new Set(rows.map((r) => r.contact_id))].sort());
  });

  it("nadie se autoasigna roles; sólo admin con MFA gestiona personal", async () => {
    const editor = await createStaff(admin, ["editor"]);
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("insert into public.staff_roles (user_id, role) values ($1, 'admin')", [editor])));
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("update public.staff_roles set role = 'admin' where user_id = $1", [editor])));
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("update public.staff_profiles set can_review_medical = true where user_id = $1", [editor])));
    await expectDenied(asUser(user, editor, "aal2", (c) => rpc(c, "admin_upsert_staff", [editor, "Yo", ["admin"], null, true, true])));

    const boss = await createStaff(admin, ["admin"]);
    await expect(asUser(user, boss, "aal1", (c) => rpc(c, "admin_upsert_staff", [editor, "Yo", ["admin"], null, true, true]))).rejects.toThrow(/mfa_required/);
    const ok = await asUser(user, boss, "aal2", (c) => rpc<{ ok: boolean }>(c, "admin_upsert_staff", [editor, "Editora", ["editor", "reception"], null, false, true]));
    expect(ok.ok).toBe(true);
    const audit = await admin.query("select count(*)::int as n from public.audit_log where action = 'staff.upsert' and entity_id = $1", [editor]);
    expect(audit.rows[0].n).toBe(1);
  });

  it("no se puede dejar la clínica sin administradores ni alterar la auditoría", async () => {
    const boss = await createStaff(admin, ["admin"]);
    // Desactivar a todos los demás admins en una transacción que se revierte.
    await admin.query("begin");
    try {
      await admin.query("update public.staff_profiles set active = false where user_id <> $1 and user_id in (select user_id from public.staff_roles where role = 'admin')", [boss]);
      await admin.query("savepoint s");
      await admin.query("set local role authenticated");
      await admin.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: boss, role: "authenticated", aal: "aal2" })]);
      await expect(admin.query("select public.admin_upsert_staff($1, 'Admin', '{editor}', null, false, true)", [boss])).rejects.toThrow(/last_admin/);
    } finally {
      await admin.query("rollback");
    }
    await expect(admin.query("delete from public.audit_log")).rejects.toThrow(/sólo inserción/);
  });

  it("service_role no accede directamente a tablas (sólo vía funciones)", async () => {
    await expectDenied(asService(user, (c) => c.query("select * from public.contacts limit 1")));
  });
});

describe("autogestión con enlaces opacos", () => {
  async function issue(contactId: string, appointmentId: string | null) {
    const token = newToken();
    await asService(service, (c) => rpc(c, "manage_issue_token", [contactId, appointmentId, sha256(token)]));
    return token;
  }

  it("token canjeable una sola vez; vencido o usado no sirve; otra cita denegada", async () => {
    const fx = await createOffer(admin);
    const mine = await bookConfirmed(service, fx, limaInstant(day, "14:00"));
    const theirs = await bookConfirmed(service, fx, limaInstant(day, "15:00"));
    const { rows } = await admin.query("select contact_id from public.appointments where id = $1", [mine.appointmentId]);
    const token = await issue(rows[0].contact_id, mine.appointmentId);

    const session = sha256(newToken());
    expect(await asService(service, (c) => rpc(c, "manage_redeem", [sha256(token), session]))).toMatchObject({ ok: true });
    expect(await asService(service, (c) => rpc(c, "manage_redeem", [sha256(token), sha256(newToken())]))).toMatchObject({
      ok: false, code: "invalid_or_expired",
    });

    const overview = await asService(service, (c) => rpc<{ ok: boolean; appointments: { appointment_id: string }[] }>(c, "manage_overview", [session]));
    expect(overview.appointments.map((a) => a.appointment_id)).toEqual([mine.appointmentId]);

    const foreign = await asService(service, (c) => rpc(c, "manage_cancel", [session, theirs.appointmentId]));
    expect(foreign).toMatchObject({ ok: false, code: "not_found" });

    const expired = await issue(rows[0].contact_id, mine.appointmentId);
    await admin.query("update private.access_tokens set expires_at = now() - interval '1 second' where token_hash = $1", [sha256(expired)]);
    expect(await asService(service, (c) => rpc(c, "manage_redeem", [sha256(expired), sha256(newToken())]))).toMatchObject({ ok: false });

    // Cancelación por la paciente dentro del plazo permitido.
    const cancel = await asService(service, (c) => rpc<{ ok: boolean }>(c, "manage_cancel", [session, mine.appointmentId]));
    expect(cancel.ok).toBe(true);
    const outbox = await admin.query("select kind from public.notification_outbox where appointment_id = $1 order by created_at", [mine.appointmentId]);
    expect(outbox.rows.map((r) => r.kind)).toContain("booking_cancelled");
  });

  it("fuera del plazo de cancelación se deriva a recepción", async () => {
    const fx = await createOffer(admin);
    const soon = limaDate(1);
    await admin.query("update public.clinic_settings_private set cancellation_window_hours = 72 where id");
    try {
      const booked = await bookConfirmed(service, fx, limaInstant(soon, "19:00"));
      const { rows } = await admin.query("select contact_id from public.appointments where id = $1", [booked.appointmentId]);
      const token = await issue(rows[0].contact_id, booked.appointmentId);
      const session = sha256(newToken());
      await asService(service, (c) => rpc(c, "manage_redeem", [sha256(token), session]));
      expect(await asService(service, (c) => rpc(c, "manage_cancel", [session, booked.appointmentId]))).toMatchObject({
        ok: false, code: "outside_window",
      });
    } finally {
      await admin.query("update public.clinic_settings_private set cancellation_window_hours = 24 where id");
    }
  });

  it("reenvío de enlace responde igual exista o no el correo", async () => {
    const a = await asService(service, (c) => rpc(c, "manage_request_link", ["no-existe@example.test"]));
    expect(a).toEqual({ ok: true });
  });
});

describe("outbox de notificaciones", () => {
  it("reintentos con backoff, fallo visible y reintento manual sin duplicados", async () => {
    const fx = await createOffer(admin);
    const previous = (await admin.query("select reception_notification_email as e from public.clinic_settings_private where id")).rows[0].e;
    await admin.query("update public.clinic_settings_private set reception_notification_email = 'recepcion@example.test' where id");
    try {
      const booked = await bookConfirmed(service, fx, limaInstant(day, "16:00"));
      const { rows } = await admin.query(
        "select id, kind, dedupe_key from public.notification_outbox where appointment_id = $1 order by kind",
        [booked.appointmentId],
      );
      expect(rows.map((r) => r.kind)).toEqual(["booking_confirmed", "booking_reminder", "staff_new_booking"]);
      const target = rows.find((r) => r.kind === "booking_confirmed")!;
      await admin.query("update public.notification_outbox set max_attempts = 2 where id = $1", [target.id]);

      // Dos workers concurrentes nunca reclaman el mismo mensaje.
      const [w1, w2] = [await connect(), await connect()];
      try {
        const [a, b] = await Promise.all([
          asService(w1, (c) => c.query("select id from public.outbox_claim('w1', 100, 60)")),
          asService(w2, (c) => c.query("select id from public.outbox_claim('w2', 100, 60)")),
        ]);
        const ids = [...a.rows, ...b.rows].map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toContain(target.id);
        const owner = a.rows.some((r) => r.id === target.id) ? "w1" : "w2";
        await asService(service, (c) => rpc(c, "outbox_complete", [target.id, owner, "retry", "proveedor no disponible", null]));
        const after = await admin.query("select status, next_attempt_at > now() as later from public.notification_outbox where id = $1", [target.id]);
        expect(after.rows[0]).toEqual({ status: "pending", later: true });

        await admin.query("update public.notification_outbox set next_attempt_at = now() where id = $1", [target.id]);
        await asService(service, (c) => c.query("select id from public.outbox_claim('w1', 100, 60)"));
        await asService(service, (c) => rpc(c, "outbox_complete", [target.id, "w1", "retry", "otra vez", null]));
        const failed = await admin.query("select status from public.notification_outbox where id = $1", [target.id]);
        expect(failed.rows[0].status).toBe("failed");
      } finally {
        await w1.end();
        await w2.end();
      }

      const desk = await createStaff(admin, ["reception"]);
      const visible = await asUser(user, desk, "aal2", (c) => c.query("select id from public.notification_outbox where status = 'failed' and id = $1", [target.id]));
      expect(visible.rowCount).toBe(1);
      await asUser(user, desk, "aal2", (c) => rpc(c, "staff_retry_notification", [target.id]));
      const retried = await admin.query("select status from public.notification_outbox where id = $1", [target.id]);
      expect(retried.rows[0].status).toBe("pending");

      // La misma clave de envío no se encola dos veces.
      await admin.query(
        "select private.enqueue('booking_confirmed', 'patient', $1, (select contact_id from public.appointments where id = $1), 2, $2)",
        [booked.appointmentId, target.dedupe_key],
      );
      const count = await admin.query("select count(*)::int as n from public.notification_outbox where dedupe_key = $1", [target.dedupe_key]);
      expect(count.rows[0].n).toBe(1);
    } finally {
      await admin.query("update public.clinic_settings_private set reception_notification_email = $1 where id", [previous]);
    }
  });

  it("un recordatorio de una cita reprogramada o cancelada queda obsoleto", async () => {
    const fx = await createOffer(admin);
    const booked = await bookConfirmed(service, fx, limaInstant(day, "17:00"));
    const reminder = await admin.query(
      "select id from public.notification_outbox where appointment_id = $1 and kind = 'booking_reminder'",
      [booked.appointmentId],
    );
    const desk = await createStaff(admin, ["reception"]);
    await asUser(user, desk, "aal2", (c) =>
      rpc(c, "staff_reschedule_appointment", [booked.appointmentId, fx.doctorId, limaInstant(day, "18:00"), true]),
    );
    const ctx = await asService(service, (c) => rpc<{ stale: boolean }>(c, "outbox_context", [reminder.rows[0].id]));
    expect(ctx.stale).toBe(true);
    const status = await admin.query("select status from public.notification_outbox where id = $1", [reminder.rows[0].id]);
    expect(status.rows[0].status).toBe("cancelled");
    const fresh = await admin.query(
      "select count(*)::int as n from public.notification_outbox where appointment_id = $1 and kind = 'booking_reminder' and status = 'pending'",
      [booked.appointmentId],
    );
    expect(fresh.rows[0].n).toBe(1);
  });
});

describe("CMS: flujo editorial, revisión médica y redirecciones", () => {
  async function newService(slug: string) {
    const { rows } = await admin.query(
      "insert into public.services (slug, name, summary, is_demo) values ($1, 'Servicio editorial ficticio', 'Resumen', true) returning id",
      [slug],
    );
    return rows[0].id as string;
  }

  it("borrador no visible; publicar exige revisión médica por revisor habilitado", async () => {
    const id = await newService(`editorial-${uid().slice(0, 8)}`);
    const editor = await createStaff(admin, ["editor"]);
    const reviewer = await createStaff(admin, ["professional"], { canReviewMedical: true, doctorId: (await createOffer(admin)).doctorId });
    const anon = await asAnon(user, (c) => c.query("select 1 from public.published_content where entity_id = $1", [id]));
    expect(anon.rowCount).toBe(0);

    await expect(asUser(user, editor, "aal2", (c) => rpc(c, "cms_transition", ["service", id, "publish"]))).rejects.toThrow(/medical_review_required/);
    await asUser(user, editor, "aal2", (c) => rpc(c, "cms_transition", ["service", id, "submit"]));
    await expect(asUser(user, editor, "aal2", (c) => rpc(c, "cms_transition", ["service", id, "publish"]))).rejects.toThrow(/revisor médico/);
    const res = await asUser(user, reviewer, "aal2", (c) => rpc<{ ok: boolean; path: string }>(c, "cms_transition", ["service", id, "publish"]));
    expect(res.ok).toBe(true);
    const pub = await asAnon(user, (c) => c.query("select data from public.published_content where entity_id = $1", [id]));
    expect(pub.rows[0].data.medical_reviewed_at).toBeTruthy();
  });

  it("editar algo publicado mantiene el snapshot y vuelve a borrador; editor no cambia estado directo", async () => {
    const slug = `editorial-${uid().slice(0, 8)}`;
    const id = await newService(slug);
    const editor = await createStaff(admin, ["editor"]);
    await admin.query("update public.services set status = 'medical_review' where id = $1", [id]);
    const reviewer = await createStaff(admin, ["admin"], { canReviewMedical: true });
    await asUser(user, reviewer, "aal2", (c) => rpc(c, "cms_transition", ["service", id, "publish"]));

    await asUser(user, editor, "aal2", (c) => c.query("update public.services set summary = 'Nuevo resumen' where id = $1", [id]));
    const row = await admin.query("select status, medical_reviewed_at from public.services where id = $1", [id]);
    expect(row.rows[0]).toEqual({ status: "draft", medical_reviewed_at: null });
    const pub = await admin.query("select data->>'summary' as s from public.published_content where entity_id = $1", [id]);
    expect(pub.rows[0].s).toBe("Resumen");
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("update public.services set status = 'published' where id = $1", [id])));

    const rev = await admin.query("select id from public.content_revisions where entity_id = $1 and reason = 'update' order by id desc limit 1", [id]);
    await asUser(user, editor, "aal2", (c) => rpc(c, "cms_restore_revision", [rev.rows[0].id]));
    const restored = await admin.query("select summary, status from public.services where id = $1", [id]);
    expect(restored.rows[0]).toEqual({ summary: "Resumen", status: "draft" });
  });

  it("cambio de slug publicado crea 301 sin cadenas ni bucles", async () => {
    const base = `slug-${uid().slice(0, 8)}`;
    const id = await newService(base);
    const reviewer = await createStaff(admin, ["admin"], { canReviewMedical: true });
    const publish = async () => {
      await admin.query("update public.services set status = 'medical_review' where id = $1", [id]);
      await asUser(user, reviewer, "aal2", (c) => rpc(c, "cms_transition", ["service", id, "publish"]));
    };
    await publish();
    await admin.query("update public.services set slug = $2 where id = $1", [id, `${base}-v2`]);
    await publish();
    await admin.query("update public.services set slug = $2 where id = $1", [id, `${base}-v3`]);
    await publish();
    const redirects = await admin.query("select from_path, to_path from public.redirects where to_path like $1 order by from_path", [`/servicios/${base}%`]);
    expect(redirects.rows).toEqual([
      { from_path: `/servicios/${base}`, to_path: `/servicios/${base}-v3` },
      { from_path: `/servicios/${base}-v2`, to_path: `/servicios/${base}-v3` },
    ]);
    // Volver al slug original elimina la redirección que lo tenía como origen: sin bucle.
    await admin.query("update public.services set slug = $2 where id = $1", [id, base]);
    await publish();
    const after = await admin.query("select from_path, to_path from public.redirects where from_path like $1 order by from_path", [`/servicios/${base}%`]);
    expect(after.rows).toEqual([
      { from_path: `/servicios/${base}-v2`, to_path: `/servicios/${base}` },
      { from_path: `/servicios/${base}-v3`, to_path: `/servicios/${base}` },
    ]);
    await expect(
      admin.query("insert into public.redirects (from_path, to_path) values ($1, $2)", [`/servicios/${base}`, `/servicios/${base}-v2`]),
    ).rejects.toThrow(/redirect_loop/);
  });

  it("perfil profesional sólo se publica con credenciales verificadas por admin", async () => {
    const editor = await createStaff(admin, ["editor"]);
    const boss = await createStaff(admin, ["admin"]);
    const { rows } = await admin.query(
      "insert into public.doctors (slug, full_name, cmp_number, is_demo) values ($1, 'Profesional Ficticia', '000000', true) returning id",
      [`perfil-${uid().slice(0, 8)}`],
    );
    const id = rows[0].id;
    await expectDenied(asUser(user, editor, "aal2", (c) => rpc(c, "cms_transition", ["doctor", id, "publish"])));
    await expect(asUser(user, boss, "aal2", (c) => rpc(c, "cms_transition", ["doctor", id, "publish"]))).rejects.toThrow(/credentials_unverified/);
    await expectDenied(asUser(user, editor, "aal2", (c) => c.query("update public.doctors set credentials_verified = true where id = $1", [id])));
    await asUser(user, boss, "aal2", (c) => c.query("update public.doctors set credentials_verified = true where id = $1", [id]));
    expect(await asUser(user, boss, "aal2", (c) => rpc(c, "cms_transition", ["doctor", id, "publish"]))).toMatchObject({ ok: true });
  });
});

describe("bootstrap del primer administrador", () => {
  it("sólo funciona si no existe ningún admin", async () => {
    const someone = await createUser(admin);
    await createStaff(admin, ["admin"]);
    const r = await asService(service, (c) => rpc(c, "bootstrap_first_admin", [someone, "Intento"]));
    expect(r).toMatchObject({ ok: false, code: "admin_exists" });
  });
});
