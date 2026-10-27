import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { AppointmentStatus, ORIGIN_LABELS, OUTBOX_STATUS, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/surface";
import { APPOINTMENT_SELECT, doctorLabel, listDoctorsAdmin, type AppointmentRow } from "@/features/admin/data";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime, formatLimaTime } from "@/lib/datetime";

import { rescheduleAppointment, retryNotification, transitionAppointment, updateAppointmentNote } from "../../agenda/actions";
import { StaffSlotPicker } from "../../agenda/staff-slot-picker";

export const metadata: Metadata = { title: "Cita" };

const EVENT_LABELS: Record<string, string> = {
  hold_created: "Horario retenido (web)",
  hold_released: "Retención liberada",
  hold_expired: "Retención vencida",
  booked: "Reserva web",
  created: "Registrada por personal",
  status_changed: "Cambio de estado",
  rescheduled: "Reprogramada",
  cancelled: "Cancelada",
  pending_expired: "Solicitud vencida sin confirmar",
};

const TRANSITIONS: Record<string, { to: string; label: string; tone?: "danger" }[]> = {
  pending_confirmation: [{ to: "confirmed", label: "Confirmar" }, { to: "cancelled", label: "Cancelar", tone: "danger" }],
  confirmed: [{ to: "completed", label: "Marcar atendida" }, { to: "no_show", label: "Marcar no asistió" }, { to: "cancelled", label: "Cancelar", tone: "danger" }],
  completed: [{ to: "no_show", label: "Corregir: no asistió" }],
  no_show: [{ to: "completed", label: "Corregir: atendida" }],
  expired: [{ to: "confirmed", label: "Reactivar y confirmar (revalida capacidad)" }],
  cancelled: [{ to: "confirmed", label: "Reactivar y confirmar (revalida capacidad)" }],
};

export default async function AppointmentPage({ params }: PageProps<"/admin/citas/[id]">) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff(["admin", "reception", "professional"]);
  const { data } = await supabase.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const a = data as unknown as AppointmentRow;
  const desk = hasRole(staff, "admin", "reception");
  const [{ data: events }, { data: outbox }, contactRes, doctors] = await Promise.all([
    supabase.from("appointment_events").select("id, at, actor_kind, event, from_status, to_status, details").eq("appointment_id", id).order("at"),
    supabase.from("notification_outbox").select("id, kind, recipient, status, attempts, last_error, scheduled_at, sent_at").eq("appointment_id", id).order("created_at"),
    a.contact_id ? supabase.rpc("staff_contact_detail", { p_contact_id: a.contact_id }) : Promise.resolve({ data: null }),
    desk ? listDoctorsAdmin(supabase) : Promise.resolve([]),
  ]);
  const contact = contactRes.data as { full_name: string; email: string | null; email_verified: boolean; phone_e164: string | null } | null;
  const transitions = (TRANSITIONS[a.status] ?? []).filter((t) => desk || ["completed", "no_show"].includes(t.to));

  return (
    <>
      <PageHeader title={`Cita · ${formatLimaDateTime(a.starts_at)}`} description={`${a.service?.name ?? ""} · ${doctorLabel(a.doctor)} · hasta ${formatLimaTime(a.ends_at)} (hora de Lima)`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Panel title="Estado">
            <div className="flex flex-wrap items-center gap-3">
              <AppointmentStatus status={a.status} />
              <Badge>Origen: {ORIGIN_LABELS[a.origin] ?? a.origin}</Badge>
              <Badge>Versión {a.version}</Badge>
            </div>
            {transitions.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {transitions.map((t) => (
                  <ActionForm key={t.to} action={transitionAppointment} submitLabel={t.label} submitVariant={t.tone === "danger" ? "danger" : "secondary"} inline>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="to" value={t.to} />
                    {t.to === "cancelled" ? (
                      <Select name="reason" aria-label="Motivo de cancelación" defaultValue="patient_request" className="min-h-10 w-auto py-1.5 text-sm">
                        <option value="patient_request">A pedido de la paciente</option>
                        <option value="clinic_reschedule">Reprogramación de la clínica</option>
                        <option value="duplicate">Duplicada</option>
                        <option value="other">Otro</option>
                      </Select>
                    ) : null}
                    {t.to === "confirmed" || t.to === "cancelled" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-plum" /> Avisar por correo
                      </label>
                    ) : null}
                  </ActionForm>
                ))}
              </div>
            ) : null}
          </Panel>

          {desk && ["pending_confirmation", "confirmed"].includes(a.status) ? (
            <Panel title="Reprogramar">
              <p className="mb-4 text-sm text-muted">El nuevo horario se adquiere y el anterior se libera en una sola operación. Si falla, la cita no cambia.</p>
              <ActionForm action={rescheduleAppointment} submitLabel="Reprogramar">
                <input type="hidden" name="id" value={a.id} />
                <StaffSlotPicker fixedServiceId={a.service_id} defaultDoctorId={a.doctor_id} doctors={doctors.filter((d) => d.active).map((d) => ({ id: d.id, label: doctorLabel(d) }))} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="notify" defaultChecked className="size-5 accent-plum" /> Avisar por correo
                </label>
              </ActionForm>
            </Panel>
          ) : null}

          <Panel title="Trazabilidad">
            <ol className="space-y-2">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3 text-sm">
                  <span className="tabular-nums text-muted">{formatLimaDateTime(e.at)}</span>
                  <span className="font-semibold">{EVENT_LABELS[e.event] ?? e.event}</span>
                  {e.from_status || e.to_status ? <span className="text-muted">{e.from_status ?? "—"} → {e.to_status ?? "—"}</span> : null}
                  <span className="text-muted">({e.actor_kind === "staff" ? "personal" : e.actor_kind === "patient" ? "paciente" : "sistema"})</span>
                </li>
              ))}
            </ol>
          </Panel>

          {desk ? (
            <Panel title="Avisos por correo">
              <p className="mb-3 text-sm text-muted">WhatsApp automático: <strong>No configurado</strong>. La coordinación por WhatsApp es manual.</p>
              {(outbox ?? []).length ? (
                <Table>
                  <thead>
                    <tr><th scope="col">Tipo</th><th scope="col">Para</th><th scope="col">Estado</th><th scope="col">Intentos</th><th scope="col">Programado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
                  </thead>
                  <tbody>
                    {(outbox ?? []).map((o) => (
                      <tr key={o.id}>
                        <td>{o.kind}</td>
                        <td>{o.recipient === "patient" ? "Paciente" : "Recepción"}</td>
                        <td>
                          <Badge tone={o.status === "sent" ? "success" : o.status === "failed" ? "danger" : "neutral"}>{OUTBOX_STATUS[o.status] ?? o.status}</Badge>
                          {o.last_error ? <span className="block text-xs text-muted">{o.last_error}</span> : null}
                        </td>
                        <td>{o.attempts}</td>
                        <td>{formatLimaDateTime(o.scheduled_at)}</td>
                        <td>
                          {o.status === "failed" ? (
                            <ActionForm action={retryNotification} submitLabel="Reintentar" submitVariant="secondary" inline>
                              <input type="hidden" name="id" value={o.id} />
                            </ActionForm>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">Sin avisos.</p>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel title="Contacto">
            {contact ? (
              <dl className="space-y-2">
                <div><dt className="text-sm text-muted">Nombre</dt><dd className="font-semibold">{contact.full_name}</dd></div>
                <div><dt className="text-sm text-muted">Teléfono</dt><dd>{contact.phone_e164 ? <a href={`tel:${contact.phone_e164}`} className="text-plum underline">{contact.phone_e164}</a> : "—"}</dd></div>
                <div><dt className="text-sm text-muted">Correo</dt><dd className="break-all">{contact.email ?? "—"} {contact.email ? <Badge tone={contact.email_verified ? "success" : "neutral"}>{contact.email_verified ? "verificado" : "sin verificar"}</Badge> : null}</dd></div>
              </dl>
            ) : (
              <p className="text-muted">Sin contacto asociado.</p>
            )}
            <p className="mt-3 text-xs text-muted">El acceso a estos datos queda registrado en la auditoría.</p>
          </Panel>
          {desk ? (
            <Panel title="Nota administrativa">
              <Alert tone="warning" className="mb-3">No registres información clínica, síntomas ni diagnósticos.</Alert>
              <ActionForm action={updateAppointmentNote} submitLabel="Guardar nota" submitVariant="secondary">
                <input type="hidden" name="id" value={a.id} />
                <Field id="note" label="Nota">
                  {(f) => <Textarea {...f} name="note" maxLength={500} defaultValue={a.admin_note ?? ""} />}
                </Field>
              </ActionForm>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
