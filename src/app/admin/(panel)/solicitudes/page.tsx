import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/surface";
import { requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

import { updateContactRequest } from "./actions";

export const metadata: Metadata = { title: "Solicitudes" };

const TOPIC = { cita: "Coordinar cita", informacion: "Información", otro: "Otro" } as const;
const STATUS = { new: "Nueva", in_progress: "En curso", handled: "Atendida", spam: "Spam" } as const;

export default async function RequestsPage() {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const { data } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Solicitudes de contacto" description="Mensajes del formulario y solicitudes de cita (modo «Solicitar cita»). Para registrar la cita, usa «Nueva cita» en la agenda." />
      <div className="space-y-4">
        {(data ?? []).map((r) => (
          <Panel key={r.id} title={`${r.full_name} · ${TOPIC[r.topic as keyof typeof TOPIC]}`}>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={r.status === "new" ? "warning" : "neutral"}>{STATUS[r.status as keyof typeof STATUS]}</Badge>
              <Badge>{formatLimaDateTime(r.created_at)}</Badge>
            </div>
            <p className="text-sm">
              {r.phone_e164 ? <a className="text-plum underline" href={`tel:${r.phone_e164}`}>{r.phone_e164}</a> : null}
              {r.phone_e164 && r.email ? " · " : null}
              {r.email ? <a className="text-plum underline" href={`mailto:${r.email}`}>{r.email}</a> : null}
            </p>
            {r.message ? <p className="mt-2 whitespace-pre-line text-muted">{r.message}</p> : null}
            <div className="mt-3">
              <ActionForm action={updateContactRequest} submitLabel="Actualizar" submitVariant="secondary" inline>
                <input type="hidden" name="id" value={r.id} />
                <Select name="status" aria-label="Estado" defaultValue={r.status} className="min-h-10 w-auto py-1.5 text-sm">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </ActionForm>
            </div>
          </Panel>
        ))}
        {!(data ?? []).length ? <p className="text-muted">No hay solicitudes.</p> : null}
      </div>
    </>
  );
}
