import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/surface";
import { doctorLabel, listDoctorsAdmin, listServicesAdmin } from "@/features/admin/data";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime, limaDateKey } from "@/lib/datetime";

import { addException, addResource, deleteException, linkResource } from "./actions";

export const metadata: Metadata = { title: "Feriados y bloqueos" };

const KIND = { holiday: "Feriado (sede)", absence: "Ausencia", block: "Bloqueo" } as const;

export default async function AvailabilityPage() {
  const { supabase, staff } = await requireStaff(["admin", "reception"]);
  const nowIso = new Date().toISOString();
  const [{ data: exceptions }, doctors, services, { data: resources }, { data: links }] = await Promise.all([
    supabase.from("schedule_exceptions").select("*").order("period"),
    listDoctorsAdmin(supabase),
    listServicesAdmin(supabase),
    supabase.from("resources").select("*").order("name"),
    supabase.from("service_resources").select("service_id, resource_id"),
  ]);
  const upcoming = (exceptions ?? []).filter((e) => {
    const end = /,\s*"?([^")\]]+)"?[)\]]$/.exec(e.period)?.[1];
    return !end || new Date(end).toISOString() > nowIso;
  });
  const range = (period: string) => {
    const m = /^[[(]"?([^",]+)"?,"?([^")\]]+)"?[)\]]$/.exec(period);
    return m ? `${formatLimaDateTime(m[1]!)} → ${formatLimaDateTime(m[2]!)}` : period;
  };
  const isAdmin = hasRole(staff, "admin");
  return (
    <>
      <PageHeader title="Feriados, ausencias y bloqueos" description="Bloquean disponibilidad en la web y para recepción. Horas de Lima." />
      <div className="space-y-6">
        <Panel title="Registrar">
          <ActionForm action={addException} submitLabel="Registrar">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="kind" label="Tipo">
                {(a) => (
                  <Select {...a} name="kind" defaultValue="absence">
                    {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                )}
              </Field>
              <Field id="doctor_id" label="Profesional" description="No aplica a feriados.">
                {(a) => (
                  <Select {...a} name="doctor_id" defaultValue="">
                    <option value="">—</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{doctorLabel(d)}</option>)}
                  </Select>
                )}
              </Field>
              <Field id="note" label="Nota interna (sin datos clínicos)">{(a) => <Input {...a} name="note" maxLength={200} />}</Field>
              <Field id="from_date" label="Desde (fecha)">{(a) => <Input {...a} name="from_date" type="date" defaultValue={limaDateKey()} />}</Field>
              <Field id="from_time" label="Desde (hora, opcional)">{(a) => <Input {...a} name="from_time" type="time" />}</Field>
              <div className="hidden sm:block" />
              <Field id="to_date" label="Hasta (fecha)">{(a) => <Input {...a} name="to_date" type="date" defaultValue={limaDateKey()} />}</Field>
              <Field id="to_time" label="Hasta (hora, opcional)" description="Sin hora: hasta el final del día.">{(a) => <Input {...a} name="to_time" type="time" />}</Field>
            </div>
          </ActionForm>
        </Panel>
        <Panel title="Próximos y vigentes">
          <Table>
            <thead><tr><th scope="col">Tipo</th><th scope="col">Profesional</th><th scope="col">Periodo</th><th scope="col">Nota</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {upcoming.map((e) => (
                <tr key={e.id}>
                  <td><Badge>{KIND[e.kind as keyof typeof KIND]}</Badge></td>
                  <td>{e.doctor_id ? doctorLabel(doctors.find((d) => d.id === e.doctor_id)) : "Toda la sede"}</td>
                  <td>{range(e.period)}</td>
                  <td className="text-muted">{e.note ?? "—"}</td>
                  <td>
                    <ActionForm action={deleteException} submitLabel="Eliminar" submitVariant="ghost" inline>
                      <input type="hidden" name="id" value={e.id} />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        {isAdmin ? (
          <Panel title="Recursos compartidos (opcional)">
            <p className="mb-4 text-sm text-muted">Si un servicio necesita un consultorio o equipo que comparten varios profesionales, vincúlalo: la agenda impedirá usarlo dos veces al mismo tiempo.</p>
            <ActionForm action={addResource} submitLabel="Crear recurso" submitVariant="secondary">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="r-name" label="Nombre">{(a) => <Input {...a} name="name" />}</Field>
                <Field id="r-kind" label="Tipo">
                  {(a) => (
                    <Select {...a} name="kind">
                      <option value="room">Consultorio</option>
                      <option value="equipment">Equipo</option>
                    </Select>
                  )}
                </Field>
              </div>
            </ActionForm>
            {(resources ?? []).map((r) => (
              <div key={r.id} className="mt-6 border-t border-line pt-4">
                <p className="font-semibold">{r.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {services.map((s) => {
                    const linked = (links ?? []).some((l) => l.resource_id === r.id && l.service_id === s.id);
                    return (
                      <ActionForm key={s.id} action={linkResource} submitLabel={`${linked ? "✓ " : ""}${s.name}`} submitVariant={linked ? "primary" : "secondary"} inline>
                        <input type="hidden" name="service_id" value={s.id} />
                        <input type="hidden" name="resource_id" value={r.id} />
                        <input type="hidden" name="op" value={linked ? "remove" : "add"} />
                      </ActionForm>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>
        ) : null}
      </div>
    </>
  );
}
