import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/surface";
import { requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

import { updateComplaint, updatePrivacyRequest } from "./actions";

export const metadata: Metadata = { title: "Reclamaciones y derechos" };

const C_STATUS = { received: "Recibido", in_progress: "En curso", answered: "Respondido", closed: "Cerrado" };
const P_STATUS = { received: "Recibida", identity_check: "Verificando identidad", in_progress: "En curso", resolved: "Resuelta", rejected: "Rechazada" };
const P_KIND = { acceso: "Acceso", rectificacion: "Rectificación", cancelacion: "Cancelación", oposicion: "Oposición", revocacion: "Revocación", otro: "Otro" };

export default async function ComplaintsAdminPage() {
  const { supabase } = await requireStaff(["admin"]);
  const [{ data: complaints }, { data: requests }] = await Promise.all([
    supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("privacy_requests").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <>
      <PageHeader title="Reclamaciones y derechos de privacidad" description="Acceso restringido a administración. Plazos y textos de respuesta: según validación legal." />
      <Alert tone="warning" className="mb-6">Los plazos de respuesta no se calculan automáticamente hasta que la asesoría legal los confirme (ver docs/PRIVACY_REVIEW.md).</Alert>
      <h2 className="mb-3 text-2xl">Libro de reclamaciones</h2>
      <div className="mb-10 space-y-4">
        {(complaints ?? []).map((c) => (
          <Panel key={c.id} title={`${c.code} · ${c.kind === "reclamo" ? "Reclamo" : "Queja"}`}>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={c.status === "received" ? "warning" : "neutral"}>{C_STATUS[c.status as keyof typeof C_STATUS]}</Badge>
              <Badge>{formatLimaDateTime(c.created_at)}</Badge>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Consumidor</dt><dd>{c.consumer_name} · {c.document_type} {c.document_number}{c.is_minor ? ` (menor; apoderado: ${c.guardian_name})` : ""}</dd></div>
              <div><dt className="text-muted">Contacto</dt><dd>{c.email}{c.phone_e164 ? ` · ${c.phone_e164}` : ""}</dd></div>
              <div><dt className="text-muted">Servicio</dt><dd>{c.service_description}{c.amount_pen ? ` · S/ ${c.amount_pen}` : ""}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted">Detalle</dt><dd className="whitespace-pre-line">{c.detail}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted">Pedido</dt><dd className="whitespace-pre-line">{c.consumer_request}</dd></div>
            </dl>
            <div className="mt-4">
              <ActionForm action={updateComplaint} submitLabel="Actualizar" submitVariant="secondary">
                <input type="hidden" name="id" value={c.id} />
                <Field id={`cs-${c.id}`} label="Estado">
                  {(a) => <Select {...a} name="status" defaultValue={c.status}>{Object.entries(C_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                </Field>
                <Field id={`cr-${c.id}`} label="Respuesta / acciones del proveedor">{(a) => <Textarea {...a} name="response" rows={3} defaultValue={c.response_text ?? ""} />}</Field>
              </ActionForm>
            </div>
          </Panel>
        ))}
        {!(complaints ?? []).length ? <p className="text-muted">Sin registros.</p> : null}
      </div>
      <h2 className="mb-3 text-2xl">Solicitudes de derechos (datos personales)</h2>
      <div className="space-y-4">
        {(requests ?? []).map((r) => (
          <Panel key={r.id} title={`${P_KIND[r.kind as keyof typeof P_KIND]} · ${r.requester_name}`}>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={r.status === "received" ? "warning" : "neutral"}>{P_STATUS[r.status as keyof typeof P_STATUS]}</Badge>
              <Badge>{formatLimaDateTime(r.created_at)}</Badge>
              <Badge>{r.email}</Badge>
            </div>
            {r.detail ? <p className="whitespace-pre-line text-sm text-muted">{r.detail}</p> : null}
            <div className="mt-4">
              <ActionForm action={updatePrivacyRequest} submitLabel="Actualizar" submitVariant="secondary">
                <input type="hidden" name="id" value={r.id} />
                <Field id={`ps-${r.id}`} label="Estado">
                  {(a) => <Select {...a} name="status" defaultValue={r.status}>{Object.entries(P_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
                </Field>
                <Field id={`pn-${r.id}`} label="Resolución / notas">{(a) => <Textarea {...a} name="note" rows={3} defaultValue={r.resolution_note ?? ""} />}</Field>
              </ActionForm>
            </div>
          </Panel>
        ))}
        {!(requests ?? []).length ? <p className="text-muted">Sin solicitudes.</p> : null}
      </div>
    </>
  );
}
