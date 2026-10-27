import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/surface";
import { listServicesAdmin } from "@/features/admin/data";
import { listMediaOptions, MediaSelect } from "@/features/cms/admin/media-select";
import { RevisionsPanel } from "@/features/cms/admin/revisions-panel";
import { WorkflowPanel } from "@/features/cms/admin/workflow-panel";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { isoWeekdayName, limaDateKey } from "@/lib/datetime";

import { addScheduleRule, deleteDoctorService, deleteScheduleRule, saveDoctor, upsertDoctorService } from "../actions";

export const metadata: Metadata = { title: "Profesional" };

export default async function DoctorEditPage({ params }: PageProps<"/admin/profesionales/[id]">) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff(["admin", "editor"]);
  const [{ data: d }, { data: live }, { data: offers }, { data: rules }, services, media] = await Promise.all([
    supabase.from("doctors").select("*").eq("id", id).maybeSingle(),
    supabase.from("published_content").select("path").eq("entity_type", "doctor").eq("entity_id", id).maybeSingle(),
    supabase.from("doctor_services").select("*, service:services(name)").eq("doctor_id", id),
    supabase.from("schedule_rules").select("*").eq("doctor_id", id).order("weekday").order("start_time"),
    listServicesAdmin(supabase),
    listMediaOptions(supabase),
  ]);
  if (!d) notFound();
  const isAdmin = hasRole(staff, "admin");
  const back = `/admin/profesionales/${id}`;
  return (
    <>
      <PageHeader title={`${d.honorific ?? ""} ${d.full_name}`.trim()} description={<>Perfil y agenda <DemoBadge demo={d.is_demo} /></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Perfil público">
            <ActionForm action={saveDoctor} submitLabel="Guardar">
              <input type="hidden" name="id" value={d.id} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="honorific" label="Tratamiento">
                  {(a) => (
                    <Select {...a} name="honorific" defaultValue={d.honorific ?? ""}>
                      <option value="">—</option>
                      {["Dra.", "Dr.", "Obst.", "Lic."].map((h) => <option key={h}>{h}</option>)}
                    </Select>
                  )}
                </Field>
                <Field id="full_name" label="Nombre completo" required className="sm:col-span-2">{(a) => <Input {...a} name="full_name" defaultValue={d.full_name} />}</Field>
                <Field id="slug" label="Slug (URL)" required>{(a) => <Input {...a} name="slug" defaultValue={d.slug} />}</Field>
                <Field id="specialty" label="Especialidad" className="sm:col-span-2">{(a) => <Input {...a} name="specialty" defaultValue={d.specialty ?? ""} />}</Field>
                <Field id="cmp_number" label="CMP">{(a) => <Input {...a} name="cmp_number" inputMode="numeric" defaultValue={d.cmp_number ?? ""} />}</Field>
                <Field id="rne_number" label="RNE">{(a) => <Input {...a} name="rne_number" inputMode="numeric" defaultValue={d.rne_number ?? ""} />}</Field>
                <Field id="sort_order" label="Orden">{(a) => <Input {...a} name="sort_order" type="number" defaultValue={d.sort_order} />}</Field>
              </div>
              <Field id="bio_md" label="Presentación (Markdown)" description="Redactada o aprobada por la profesional.">{(a) => <Textarea {...a} name="bio_md" rows={6} defaultValue={d.bio_md} />}</Field>
              <Field id="background_md" label="Trayectoria (Markdown)" description="Sólo información respaldada (formación, cargos verificables). Sin años de experiencia no comprobados.">{(a) => <Textarea {...a} name="background_md" rows={6} defaultValue={d.background_md} />}</Field>
              <MediaSelect id="photo_media_id" name="photo_media_id" label="Fotografía (real y autorizada)" value={d.photo_media_id} media={media} />
              <fieldset className="space-y-4 rounded-2xl border border-line p-4">
                <legend className="px-1 font-semibold">SEO</legend>
                <Field id="seo_title" label="Título SEO (≤ 70)">{(a) => <Input {...a} name="seo_title" maxLength={70} defaultValue={d.seo_title ?? ""} />}</Field>
                <Field id="seo_description" label="Descripción SEO (≤ 170)">{(a) => <Textarea {...a} name="seo_description" maxLength={170} rows={2} defaultValue={d.seo_description ?? ""} />}</Field>
                <MediaSelect id="og_media_id" name="og_media_id" label="Imagen para redes (OG)" value={d.og_media_id} media={media} />
              </fieldset>
              <fieldset className="space-y-3 rounded-2xl border border-line p-4" disabled={!isAdmin}>
                <legend className="px-1 font-semibold">Administración {isAdmin ? "" : "(sólo admin)"}</legend>
                <Checkbox
                  id="credentials_verified"
                  name="credentials_verified"
                  label="CMP/RNE verificados en el registro oficial"
                  description="Cambiar CMP o RNE anula esta verificación automáticamente."
                  defaultChecked={d.credentials_verified}
                />
                <Checkbox id="active" name="active" label="Activa en la agenda" defaultChecked={d.active} />
                <Checkbox id="online_booking_enabled" name="online_booking_enabled" label="Reservable en la web" defaultChecked={d.online_booking_enabled} />
              </fieldset>
            </ActionForm>
          </Panel>

          <Panel title="Servicios, duración y buffers">
            {!isAdmin ? <Alert tone="info" className="mb-3">Sólo administración modifica la agenda.</Alert> : null}
            <Table>
              <thead>
                <tr><th scope="col">Servicio</th><th scope="col">Duración</th><th scope="col">Buffers</th><th scope="col">Web</th><th scope="col">Activo</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {(offers ?? []).map((o) => (
                  <tr key={o.service_id}>
                    <td>{o.service?.name}</td>
                    <td>{o.duration_minutes} min</td>
                    <td>{o.buffer_before_minutes} / {o.buffer_after_minutes} min</td>
                    <td>{o.online_booking ? "Sí" : "No"}</td>
                    <td>{o.active ? <Badge tone="success">Sí</Badge> : <Badge>No</Badge>}</td>
                    <td>
                      {isAdmin ? (
                        <ActionForm action={deleteDoctorService} submitLabel="Quitar" submitVariant="ghost" inline>
                          <input type="hidden" name="doctor_id" value={d.id} />
                          <input type="hidden" name="service_id" value={o.service_id} />
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {isAdmin ? (
              <div className="mt-6 border-t border-line pt-4">
                <h3 className="mb-3 font-sans font-semibold">Agregar o actualizar servicio</h3>
                <ActionForm action={upsertDoctorService} submitLabel="Guardar servicio" submitVariant="secondary">
                  <input type="hidden" name="doctor_id" value={d.id} />
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Field id="ds-service" label="Servicio" className="sm:col-span-2">
                      {(a) => (
                        <Select {...a} name="service_id" defaultValue="">
                          <option value="">Elegir…</option>
                          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                      )}
                    </Field>
                    <Field id="ds-duration" label="Duración (min)">{(a) => <Input {...a} name="duration_minutes" type="number" min={5} max={480} defaultValue={30} />}</Field>
                    <Field id="ds-before" label="Buffer antes">{(a) => <Input {...a} name="buffer_before_minutes" type="number" min={0} max={120} defaultValue={0} />}</Field>
                    <Field id="ds-after" label="Buffer después">{(a) => <Input {...a} name="buffer_after_minutes" type="number" min={0} max={120} defaultValue={0} />}</Field>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <Checkbox id="ds-online" name="online_booking" label="Reservable en la web" defaultChecked />
                    <Checkbox id="ds-active" name="active" label="Activo" defaultChecked />
                  </div>
                </ActionForm>
              </div>
            ) : null}
          </Panel>

          <Panel title="Horario semanal (hora de Lima)">
            <p className="mb-3 text-sm text-muted">Los descansos se representan con bloques separados (p. ej. 09:00–13:00 y 15:00–19:00). Ausencias, feriados y bloqueos puntuales: <Link href="/admin/disponibilidad" className="text-plum underline">Feriados y bloqueos</Link>.</p>
            <Table>
              <thead>
                <tr><th scope="col">Día</th><th scope="col">Bloque</th><th scope="col">Intervalo</th><th scope="col">Vigencia</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {(rules ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="capitalize">{isoWeekdayName(r.weekday)}</td>
                    <td>{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</td>
                    <td>cada {r.slot_interval_minutes} min</td>
                    <td>{r.valid_from}{r.valid_until ? ` → ${r.valid_until}` : " → sin fin"}</td>
                    <td>
                      {isAdmin ? (
                        <ActionForm action={deleteScheduleRule} submitLabel="Eliminar" submitVariant="ghost" inline>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="doctor_id" value={d.id} />
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {isAdmin ? (
              <div className="mt-6 border-t border-line pt-4">
                <h3 className="mb-3 font-sans font-semibold">Agregar bloque</h3>
                <ActionForm action={addScheduleRule} submitLabel="Agregar bloque" submitVariant="secondary">
                  <input type="hidden" name="doctor_id" value={d.id} />
                  <fieldset>
                    <legend className="mb-2 font-semibold">Días</legend>
                    <div className="flex flex-wrap gap-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <label key={n} className="flex items-center gap-2 capitalize">
                          <input type="checkbox" name="weekday" value={n} className="size-5 accent-plum" /> {isoWeekdayName(n)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid gap-4 sm:grid-cols-5">
                    <Field id="r-start" label="Desde">{(a) => <Input {...a} name="start_time" type="time" defaultValue="09:00" />}</Field>
                    <Field id="r-end" label="Hasta">{(a) => <Input {...a} name="end_time" type="time" defaultValue="13:00" />}</Field>
                    <Field id="r-int" label="Intervalo (min)">{(a) => <Input {...a} name="slot_interval_minutes" type="number" defaultValue={30} min={5} max={240} />}</Field>
                    <Field id="r-from" label="Vigente desde">{(a) => <Input {...a} name="valid_from" type="date" defaultValue={limaDateKey()} />}</Field>
                    <Field id="r-until" label="Hasta (opcional)">{(a) => <Input {...a} name="valid_until" type="date" />}</Field>
                  </div>
                </ActionForm>
              </div>
            ) : null}
          </Panel>
        </div>
        <div className="space-y-6">
          <WorkflowPanel
            entity="doctor"
            id={d.id}
            status={d.status}
            live={Boolean(live)}
            requiresReview={false}
            canReview={false}
            canPublishDirect={isAdmin}
            back={back}
            previewHref={`/admin/vista-previa/doctor/${d.id}`}
            livePath={live?.path}
          />
          {!d.credentials_verified ? <Alert tone="warning">El perfil no se puede publicar hasta verificar CMP/RNE.</Alert> : null}
          <RevisionsPanel db={supabase} entity="doctor" id={d.id} back={back} canRestore />
        </div>
      </div>
    </>
  );
}
