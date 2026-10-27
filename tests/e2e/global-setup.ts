import { clearMail, sql } from "./db";

/** Estado conocido: sin límites de frecuencia acumulados, modo automático y buzón local vacío. */
export default async function globalSetup() {
  await sql("delete from private.rate_limits");
  await sql("update public.clinic_settings_public set booking_mode = 'automatic', ga4_measurement_id = null where id");
  await clearMail();
}
