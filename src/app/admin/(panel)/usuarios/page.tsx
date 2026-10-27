import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/surface";
import { doctorLabel, listDoctorsAdmin } from "@/features/admin/data";
import { ROLE_LABELS, requireStaff, type StaffRole } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

import { inviteStaff, resetStaffMfa, updateStaff } from "./actions";

export const metadata: Metadata = { title: "Usuarios" };

type Row = { user_id: string; email: string; display_name: string; active: boolean; roles: StaffRole[]; doctor_id: string | null; can_review_medical: boolean; last_sign_in_at: string | null; mfa_factors: number };

function StaffFields({ prefix, row, doctors }: { prefix: string; row?: Row; doctors: { id: string; label: string }[] }) {
  return (
    <>
      <Field id={`${prefix}-name`} label="Nombre visible">{(a) => <Input {...a} name="display_name" defaultValue={row?.display_name} />}</Field>
      <fieldset>
        <legend className="mb-2 font-semibold">Roles</legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="checkbox" name="roles" value={r} defaultChecked={row?.roles.includes(r)} className="size-5 accent-plum" /> {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id={`${prefix}-doctor`} label="Profesional vinculado" description="Obligatorio para el rol Profesional: limita su agenda a la propia.">
        {(a) => (
          <Select {...a} name="doctor_id" defaultValue={row?.doctor_id ?? ""}>
            <option value="">—</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </Select>
        )}
      </Field>
      <Checkbox id={`${prefix}-review`} name="can_review_medical" label="Puede aprobar la revisión médica de contenidos" defaultChecked={row?.can_review_medical} />
    </>
  );
}

export default async function UsersPage() {
  const { supabase, userId } = await requireStaff(["admin"]);
  const [{ data, error }, doctors] = await Promise.all([supabase.rpc("admin_list_staff"), listDoctorsAdmin(supabase)]);
  const rows = (data ?? []) as Row[];
  const doctorOptions = doctors.map((d) => ({ id: d.id, label: doctorLabel(d) }));
  return (
    <>
      <PageHeader title="Usuarios del personal" description="Sin registro público: el acceso es por invitación. Cada cambio de rol queda auditado." />
      {error ? <Alert tone="danger" className="mb-6">No se pudo cargar el personal.</Alert> : null}
      <Panel title="Invitar" className="mb-6">
        <ActionForm action={inviteStaff} submitLabel="Enviar invitación">
          <Field id="inv-email" label="Correo">{(a) => <Input {...a} name="email" type="email" />}</Field>
          <StaffFields prefix="inv" doctors={doctorOptions} />
        </ActionForm>
      </Panel>
      <div className="space-y-4">
        {rows.map((r) => (
          <Panel key={r.user_id} title={`${r.display_name} · ${r.email}`}>
            <div className="mb-4 flex flex-wrap gap-2">
              {r.active ? <Badge tone="success">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}
              {r.mfa_factors > 0 ? <Badge tone="success">MFA configurado</Badge> : <Badge tone="warning">Sin MFA</Badge>}
              <Badge>Último acceso: {r.last_sign_in_at ? formatLimaDateTime(r.last_sign_in_at) : "nunca"}</Badge>
            </div>
            <ActionForm action={updateStaff} submitLabel="Guardar cambios" submitVariant="secondary">
              <input type="hidden" name="user_id" value={r.user_id} />
              <StaffFields prefix={r.user_id} row={r} doctors={doctorOptions} />
              <Checkbox id={`${r.user_id}-active`} name="active" label="Cuenta activa" defaultChecked={r.active} />
            </ActionForm>
            {r.user_id !== userId && r.mfa_factors > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <ActionForm action={resetStaffMfa} submitLabel="Restablecer MFA (pérdida de dispositivo)" submitVariant="ghost" inline>
                  <input type="hidden" name="user_id" value={r.user_id} />
                </ActionForm>
              </div>
            ) : null}
          </Panel>
        ))}
      </div>
    </>
  );
}
