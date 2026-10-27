import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

/**
 * Utilidades de pruebas SQL contra la base local de Supabase (Postgres real).
 * Cada prueba crea sus propios profesionales/servicios con identificadores aleatorios,
 * de modo que la capacidad no se comparte entre pruebas.
 */
export const DB_URL = process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export type Role = "admin" | "reception" | "professional" | "editor";

export async function connect(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const uid = () => randomUUID();
const suffix = () => randomBytes(4).toString("hex");

/** Ejecuta `fn` como service_role (lo que hace el servidor Next con la clave secreta). */
export async function asService<T>(client: pg.Client, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local role service_role");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

/** Ejecuta `fn` como usuario autenticado con el JWT indicado (aal1 o aal2). */
export async function asUser<T>(
  client: pg.Client,
  userId: string,
  aal: "aal1" | "aal2",
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated", aal }),
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export async function asAnon<T>(client: pg.Client, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local role anon");
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "anon" })]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export async function rpc<T = Record<string, unknown>>(client: pg.Client, fn: string, args: unknown[]): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await client.query(`select public.${fn}(${placeholders}) as r`, args);
  return rows[0].r as T;
}

export async function createUser(admin: pg.Client, email = `staff-${suffix()}@example.test`) {
  const id = uid();
  await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at,
       raw_app_meta_data, raw_user_meta_data)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, now(), now(), now(),
       '{"provider":"email","providers":["email"]}', '{}')`,
    [id, email],
  );
  return id;
}

export async function createStaff(
  admin: pg.Client,
  roles: Role[],
  opts: { doctorId?: string; canReviewMedical?: boolean } = {},
) {
  const userId = await createUser(admin);
  await admin.query(
    "insert into public.staff_profiles (user_id, display_name, doctor_id, can_review_medical) values ($1, $2, $3, $4)",
    [userId, `Personal de prueba ${suffix()}`, opts.doctorId ?? null, opts.canReviewMedical ?? false],
  );
  for (const role of roles) {
    await admin.query("insert into public.staff_roles (user_id, role) values ($1, $2)", [userId, role]);
  }
  return userId;
}

export type Fixture = { doctorId: string; serviceId: string };

/**
 * Crea profesional + servicio publicados y activos, con horario todos los días 08:00–20:00 (Lima)
 * y paso de `interval` minutos.
 */
export async function createOffer(
  admin: pg.Client,
  opts: { duration?: number; interval?: number; bufferBefore?: number; bufferAfter?: number; doctorId?: string; serviceId?: string } = {},
): Promise<Fixture> {
  const s = suffix();
  let doctorId = opts.doctorId;
  if (!doctorId) {
    const d = await admin.query(
      `insert into public.doctors (slug, full_name, honorific, credentials_verified, status, is_demo)
       values ($1, $2, 'Dra.', true, 'published', true) returning id`,
      [`prueba-${s}`, `Profesional Ficticia ${s}`],
    );
    doctorId = d.rows[0].id as string;
    await admin.query(
      `insert into public.published_content (entity_type, entity_id, path, slug, data, is_demo)
       values ('doctor', $1, $2, $3, jsonb_build_object('display_name', 'Dra. Ficticia ' || $3::text), true)`,
      [doctorId, `/equipo/prueba-${s}`, `prueba-${s}`],
    );
    for (let weekday = 1; weekday <= 7; weekday++) {
      await admin.query(
        `insert into public.schedule_rules (doctor_id, weekday, start_time, end_time, slot_interval_minutes, valid_from)
         values ($1, $2, '08:00', '20:00', $3, current_date - 1)`,
        [doctorId, weekday, opts.interval ?? 30],
      );
    }
  }
  let serviceId = opts.serviceId;
  if (!serviceId) {
    const sv = await admin.query(
      `insert into public.services (slug, name, status, is_demo) values ($1, $2, 'published', true) returning id`,
      [`servicio-${s}`, `Servicio de prueba ${s}`],
    );
    serviceId = sv.rows[0].id as string;
    await admin.query(
      `insert into public.published_content (entity_type, entity_id, path, slug, data, is_demo)
       values ('service', $1, $2, $3, '{}'::jsonb, true)`,
      [serviceId, `/servicios/servicio-${s}`, `servicio-${s}`],
    );
  }
  await admin.query(
    `insert into public.doctor_services (doctor_id, service_id, duration_minutes, buffer_before_minutes, buffer_after_minutes)
     values ($1, $2, $3, $4, $5)`,
    [doctorId, serviceId, opts.duration ?? 30, opts.bufferBefore ?? 0, opts.bufferAfter ?? 0],
  );
  return { doctorId, serviceId };
}

/** Fecha (YYYY-MM-DD) en Lima a `days` días de hoy. */
export function limaDate(days: number): string {
  const now = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
}

/** Instante ISO para una hora local de Lima (Lima no aplica horario de verano: UTC−05). */
export const limaInstant = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00-05:00`).toISOString();

export async function newSession(service: pg.Client) {
  const token = newToken();
  const hash = sha256(token);
  await asService(service, (c) => rpc(c, "booking_session_create", [hash]));
  return hash;
}

/** Sesión de reserva con contacto ya verificado (código conocido). */
export async function verifiedSession(service: pg.Client, email = `paciente-${suffix()}@example.test`) {
  const hash = await newSession(service);
  const codeHash = sha256(`${hash}:123456`);
  await asService(service, (c) =>
    rpc(c, "booking_start_verification", [hash, "Paciente Ficticia", email, "+51999000111", codeHash]),
  );
  const res = await asService(service, (c) => rpc<{ ok: boolean }>(c, "booking_verify_code", [hash, codeHash]));
  if (!res.ok) throw new Error("verificación falló");
  return { hash, email };
}

export async function setBookingMode(admin: pg.Client, mode: "off" | "reception" | "automatic") {
  await admin.query("update public.clinic_settings_public set booking_mode = $1 where id", [mode]);
}

export async function bookConfirmed(service: pg.Client, fx: Fixture, startsAt: string) {
  const { hash } = await verifiedSession(service);
  const hold = await asService(service, (c) =>
    rpc<{ ok: boolean; hold: { appointment_id: string } }>(c, "booking_create_hold", [hash, fx.serviceId, fx.doctorId, startsAt]),
  );
  if (!hold.ok) throw new Error(`hold falló: ${JSON.stringify(hold)}`);
  const confirmed = await asService(service, (c) =>
    rpc<{ ok: boolean; appointment: { appointment_id: string; status: string } }>(c, "booking_confirm", [
      hash, hold.hold.appointment_id, uid(), "privacidad-v0-prueba", false,
    ]),
  );
  if (!confirmed.ok) throw new Error(`confirm falló: ${JSON.stringify(confirmed)}`);
  return { sessionHash: hash, appointmentId: confirmed.appointment.appointment_id };
}
