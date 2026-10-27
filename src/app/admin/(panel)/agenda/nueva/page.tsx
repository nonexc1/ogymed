import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { doctorLabel, listDoctorsAdmin, listServicesAdmin } from "@/features/admin/data";
import { requireStaff } from "@/lib/auth/staff";

import { createAppointment } from "../actions";
import { StaffSlotPicker } from "../staff-slot-picker";

export const metadata: Metadata = { title: "Nueva cita" };

export default async function NewAppointmentPage() {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const [doctors, services] = await Promise.all([listDoctorsAdmin(supabase), listServicesAdmin(supabase)]);
  return (
    <>
      <PageHeader
        title="Registrar cita"
        description="Para citas coordinadas por teléfono, WhatsApp o en persona. Usa las mismas reglas y capacidad que la web: si alguien reserva el mismo horario a la vez, sólo una gana."
      />
      <Panel>
        <ActionForm action={createAppointment} submitLabel="Registrar cita">
          <StaffSlotPicker
            services={services.filter((s) => s.active).map((s) => ({ id: s.id, label: s.name }))}
            doctors={doctors.filter((d) => d.active).map((d) => ({ id: d.id, label: doctorLabel(d) }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="n-name" label="Nombre de la paciente" required>
              {(a) => <Input {...a} name="full_name" autoComplete="off" />}
            </Field>
            <Field id="n-phone" label="Teléfono" description="Teléfono o correo, al menos uno.">
              {(a) => <Input {...a} name="phone" type="tel" autoComplete="off" />}
            </Field>
            <Field id="n-email" label="Correo (opcional)">
              {(a) => <Input {...a} name="email" type="email" autoComplete="off" />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="n-origin" label="Origen" required>
              {(a) => (
                <Select {...a} name="origin" defaultValue="whatsapp">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Teléfono</option>
                  <option value="in_person">Presencial</option>
                  <option value="other">Otro</option>
                </Select>
              )}
            </Field>
            <Field id="n-confirm" label="Estado inicial" required>
              {(a) => (
                <Select {...a} name="confirm" defaultValue="confirmed">
                  <option value="confirmed">Confirmada</option>
                  <option value="pending">Pendiente de confirmación</option>
                </Select>
              )}
            </Field>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="notify" className="size-5 accent-plum" defaultChecked />
            Enviar correo de confirmación (si hay correo)
          </label>
          <Field id="n-note" label="Nota administrativa (opcional)" description="No registres información clínica.">
            {(a) => <Textarea {...a} name="note" maxLength={500} />}
          </Field>
        </ActionForm>
      </Panel>
    </>
  );
}
