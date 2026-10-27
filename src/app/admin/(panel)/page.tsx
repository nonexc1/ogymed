import type { Metadata } from "next";
import Link from "next/link";

import { AppointmentStatus, Panel, PageHeader, Table } from "@/components/admin/ui";
import { Alert } from "@/components/ui/surface";
import { APPOINTMENT_SELECT, doctorLabel, limaDayStart, type AppointmentRow } from "@/features/admin/data";
import { getPrivacyVersion, getSettings } from "@/features/cms/queries";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { addDaysToKey, formatLimaShortDate, formatLimaTime, isoDaysAgo, limaDateKey } from "@/lib/datetime";
import { deployEnv } from "@/lib/env";
import { bookingInfraReady, emailTransport } from "@/lib/env.server";

export const metadata: Metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const { supabase, staff } = await requireStaff();
  const desk = hasRole(staff, "admin", "reception", "professional");
  const today = limaDateKey();

  if (!desk) {
    return (
      <>
        <PageHeader title={`Hola, ${staff.display_name}`} description="Desde aquí gestionas contenido, medios y SEO." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/admin/contenido" className="rounded-2xl border border-line bg-paper p-5 font-semibold text-plum">Páginas, FAQ y blog</Link>
          <Link href="/admin/servicios" className="rounded-2xl border border-line bg-paper p-5 font-semibold text-plum">Servicios</Link>
          <Link href="/admin/medios" className="rounded-2xl border border-line bg-paper p-5 font-semibold text-plum">Medios</Link>
        </div>
      </>
    );
  }

  const weekAgo = isoDaysAgo(7);
  const [todayRes, pendingRes, cancelledRes, failedRes, requestsRes, settings, privacy, privateRes] = await Promise.all([
    supabase.from("appointments").select(APPOINTMENT_SELECT)
      .gte("starts_at", limaDayStart(today)).lt("starts_at", limaDayStart(addDaysToKey(today, 1)))
      .in("status", ["confirmed", "pending_confirmation", "completed", "no_show"]).order("starts_at"),
    supabase.from("appointments").select(APPOINTMENT_SELECT).eq("status", "pending_confirmation").order("starts_at").limit(20),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("cancelled_at", weekAgo),
    supabase.from("notification_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    getSettings(),
    getPrivacyVersion(),
    supabase.from("clinic_settings_private").select("reception_notification_email").maybeSingle(),
  ]);
  const todays = (todayRes.data ?? []) as unknown as AppointmentRow[];
  const pending = (pendingRes.data ?? []) as unknown as AppointmentRow[];

  const warnings: string[] = [];
  if (settings.booking_mode === "off") warnings.push("Las reservas web están en modo «Solicitar cita» (sin agenda en línea).");
  if (!bookingInfraReady) warnings.push("Falta configurar el servidor para reservas (clave secreta, pimienta o correo).");
  if (emailTransport === "disabled") warnings.push("El correo transaccional no está configurado: los avisos quedarán como fallidos.");
  if (emailTransport === "dev-file") warnings.push("Correo en modo desarrollo: los mensajes se guardan en .dev-mail/ y no se envían.");
  if (!privacy) warnings.push("La política de privacidad no está publicada: formularios y reservas quedan deshabilitados.");
  if (staff.roles.includes("admin") && !privateRes.data?.reception_notification_email) warnings.push("No hay correo de recepción para avisos internos.");
  if (deployEnv !== "production") warnings.push(`Entorno: ${deployEnv}. No usar datos reales de pacientes.`);

  const stat = (label: string, value: number | null | undefined, href: string) => (
    <Link href={href} className="rounded-2xl border border-line bg-paper p-5 hover:border-plum">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl text-plum-strong">{value ?? 0}</p>
    </Link>
  );

  return (
    <>
      <PageHeader title={`Hola, ${staff.display_name}`} description={`Resumen al ${formatLimaShortDate(new Date())} (hora de Lima).`} />
      {warnings.length ? (
        <Alert tone="warning" className="mb-6" title="Avisos de configuración">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stat("Citas de hoy", todays.length, `/admin/agenda?vista=dia&fecha=${today}`)}
        {stat("Pendientes de confirmar", pending.length, "/admin/agenda?estado=pending_confirmation&vista=lista")}
        {stat("Cancelaciones (7 días)", cancelledRes.count, "/admin/agenda?estado=cancelled&vista=lista")}
        {stat("Avisos fallidos", failedRes.count, "/admin/agenda/avisos")}
        {stat("Solicitudes nuevas", requestsRes.count, "/admin/solicitudes")}
      </div>
      <div className="mt-8 grid gap-6 2xl:grid-cols-2">
        <Panel title="Hoy">
          {todays.length ? (
            <Table>
              <thead>
                <tr><th scope="col">Hora</th><th scope="col">Paciente</th><th scope="col">Profesional</th><th scope="col">Estado</th></tr>
              </thead>
              <tbody>
                {todays.map((a) => (
                  <tr key={a.id}>
                    <td><Link className="font-semibold text-plum underline-offset-4 hover:underline" href={`/admin/citas/${a.id}`}>{formatLimaTime(a.starts_at)}</Link></td>
                    <td>{a.contact?.full_name ?? "—"}</td>
                    <td>{doctorLabel(a.doctor)}</td>
                    <td><AppointmentStatus status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted">No hay citas hoy.</p>
          )}
        </Panel>
        <Panel title="Solicitudes pendientes de confirmación">
          {pending.length ? (
            <Table>
              <thead>
                <tr><th scope="col">Fecha</th><th scope="col">Paciente</th><th scope="col">Servicio</th></tr>
              </thead>
              <tbody>
                {pending.map((a) => (
                  <tr key={a.id}>
                    <td><Link className="font-semibold text-plum underline-offset-4 hover:underline" href={`/admin/citas/${a.id}`}>{formatLimaShortDate(a.starts_at)} {formatLimaTime(a.starts_at)}</Link></td>
                    <td>{a.contact?.full_name ?? "—"}</td>
                    <td>{a.service?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-muted">No hay solicitudes pendientes.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
