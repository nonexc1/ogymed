import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { WorkflowPanel } from "@/features/cms/admin/workflow-panel";
import { hasRole, requireStaff } from "@/lib/auth/staff";

import { createFaq, saveFaq } from "../actions";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

const CATS = { general: "General", reservas: "Reservas", visita: "Visita", pagos: "Pagos", ubicacion: "Ubicación" };

function FaqFields({ q, a, category, sort, prefix }: { q?: string; a?: string; category?: string; sort?: number; prefix: string }) {
  return (
    <>
      <Field id={`${prefix}-q`} label="Pregunta">{(f) => <Input {...f} name="question" defaultValue={q} maxLength={200} />}</Field>
      <Field id={`${prefix}-a`} label="Respuesta (Markdown)">{(f) => <Textarea {...f} name="answer_md" defaultValue={a} rows={3} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-c`} label="Categoría">
          {(f) => (
            <Select {...f} name="category" defaultValue={category ?? "general"}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
        </Field>
        <Field id={`${prefix}-s`} label="Orden">{(f) => <Input {...f} name="sort_order" type="number" defaultValue={sort ?? 100} />}</Field>
      </div>
    </>
  );
}

export default async function FaqsAdminPage() {
  const { supabase, staff } = await requireStaff(["admin", "editor"]);
  const [{ data }, { data: live }] = await Promise.all([
    supabase.from("faqs").select("*").order("category").order("sort_order"),
    supabase.from("published_content").select("entity_id").eq("entity_type", "faq"),
  ]);
  const liveIds = new Set((live ?? []).map((l) => l.entity_id));
  return (
    <>
      <PageHeader title="Preguntas frecuentes" description="Respuestas operativas reales. Cada pregunta se publica por separado." />
      <div className="space-y-6">
        <Panel title="Nueva pregunta">
          <ActionForm action={createFaq} submitLabel="Crear borrador">
            <FaqFields prefix="new" />
          </ActionForm>
        </Panel>
        {(data ?? []).map((f) => (
          <div key={f.id} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
            <Panel title={CATS[f.category as keyof typeof CATS]} actions={<DemoBadge demo={f.is_demo} />}>
              <ActionForm action={saveFaq} submitLabel="Guardar">
                <input type="hidden" name="id" value={f.id} />
                <FaqFields prefix={f.id} q={f.question} a={f.answer_md} category={f.category} sort={f.sort_order} />
              </ActionForm>
            </Panel>
            <WorkflowPanel entity="faq" id={f.id} status={f.status} live={liveIds.has(f.id)} requiresReview={false} canReview={false} canPublishDirect={hasRole(staff, "admin", "editor")} back="/admin/contenido/faqs" />
          </div>
        ))}
      </div>
    </>
  );
}
