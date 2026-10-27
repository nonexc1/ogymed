import { clearMail, sql } from "./db";

/**
 * Estado conocido: sin límites de frecuencia acumulados, modo automático, buzón local vacío y caché de
 * contenido/configuración del servidor invalidada (evita leer datos de una ejecución anterior).
 */
export default async function globalSetup() {
  await sql("delete from private.rate_limits");
  await sql("update public.clinic_settings_public set booking_mode = 'automatic', ga4_measurement_id = null where id");
  await clearMail();
  const port = Number(process.env.E2E_PORT ?? 3000);
  const res = await fetch(`http://localhost:${port}/api/cron/revalidate`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  if (!res.ok) throw new Error(`No se pudo invalidar la caché del servidor (${res.status})`);
}
