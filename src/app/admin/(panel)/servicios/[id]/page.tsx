import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel } from "@/components/admin/ui";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { faqLines } from "@/features/cms/admin/form-helpers";
import { listMediaOptions, MediaSelect } from "@/features/cms/admin/media-select";
import { RevisionsPanel } from "@/features/cms/admin/revisions-panel";
import { WorkflowPanel } from "@/features/cms/admin/workflow-panel";
import { hasRole, requireStaff } from "@/lib/auth/staff";

import { saveService } from "../actions";

export const metadata: Metadata = { title: "Servicio" };

export default async function ServiceEditPage({ params }: PageProps<"/admin/servicios/[id]">) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff(["admin", "editor", "professional"]);
  const [{ data: s }, { data: live }, media] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    supabase.from("published_content").select("path").eq("entity_type", "service").eq("entity_id", id).maybeSingle(),
    listMediaOptions(supabase),
  ]);
  if (!s) notFound();
  const canEdit = hasRole(staff, "admin", "editor");
  const isAdmin = hasRole(staff, "admin");
  const md = (name: string, label: string, description?: string, rows = 6) => (
    <Field id={name} label={label} description={description}>
      {(a) => <Textarea {...a} name={name} rows={rows} defaultValue={s[name] ?? ""} readOnly={!canEdit} />}
    </Field>
  );
  const back = `/admin/servicios/${id}`;
  return (
    <>
      <PageHeader title={s.name} description={<>Servicio <DemoBadge demo={s.is_demo} /></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Panel title="Contenido">
          <ActionForm action={saveService} submitLabel={canEdit ? "Guardar borrador" : "Sin permisos de edición"}>
            <input type="hidden" name="id" value={s.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Nombre" required>{(a) => <Input {...a} name="name" defaultValue={s.name} />}</Field>
              <Field id="slug" label="Slug (URL)" required description="Si cambias el slug de algo publicado, se crea una redirección 301 al volver a publicar.">{(a) => <Input {...a} name="slug" defaultValue={s.slug} />}</Field>
              <Field id="category" label="Categoría">{(a) => <Input {...a} name="category" defaultValue={s.category ?? ""} />}</Field>
              <Field id="sort_order" label="Orden">{(a) => <Input {...a} name="sort_order" type="number" defaultValue={s.sort_order} />}</Field>
            </div>
            <Field id="summary" label="Resumen" description="Una o dos frases para listados.">{(a) => <Textarea {...a} name="summary" rows={2} maxLength={400} defaultValue={s.summary} />}</Field>
            {md("body_md", "Explicación (Markdown)", "Contenido revisado por el equipo médico. Sin promesas de resultados.", 10)}
            {md("audience_md", "¿A quién se dirige? (Markdown)")}
            {md("what_to_expect_md", "Qué esperar (Markdown)")}
            {md("preparation_md", "Preparación (Markdown)", "Sólo indicaciones confirmadas por el equipo médico.")}
            <Field id="faqs" label="Preguntas frecuentes" description="Una por línea: Pregunta | Respuesta">
              {(a) => <Textarea {...a} name="faqs" rows={5} defaultValue={faqLines(s.faqs ?? [])} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="price_pen" label="Precio (S/)" description="Sólo se muestra si está aprobado.">{(a) => <Input {...a} name="price_pen" inputMode="decimal" defaultValue={s.price_pen ?? ""} />}</Field>
              <div className="space-y-3 pt-7">
                <Checkbox id="price_approved" name="price_approved" label="Precio aprobado para publicar" defaultChecked={s.price_approved} />
                <Checkbox id="show_duration" name="show_duration" label="Mostrar duración aproximada" defaultChecked={s.show_duration} />
              </div>
            </div>
            <MediaSelect id="hero_media_id" name="hero_media_id" label="Imagen principal" value={s.hero_media_id} media={media} />
            <fieldset className="space-y-4 rounded-2xl border border-line p-4">
              <legend className="px-1 font-semibold">SEO</legend>
              <Field id="seo_title" label="Título SEO (≤ 70)">{(a) => <Input {...a} name="seo_title" maxLength={70} defaultValue={s.seo_title ?? ""} />}</Field>
              <Field id="seo_description" label="Descripción SEO (≤ 170)">{(a) => <Textarea {...a} name="seo_description" maxLength={170} rows={2} defaultValue={s.seo_description ?? ""} />}</Field>
              <MediaSelect id="og_media_id" name="og_media_id" label="Imagen para redes (OG)" value={s.og_media_id} media={media} />
            </fieldset>
            <fieldset className="space-y-3 rounded-2xl border border-line p-4" disabled={!isAdmin}>
              <legend className="px-1 font-semibold">Agenda {isAdmin ? "" : "(sólo administración)"}</legend>
              <Checkbox id="active" name="active" label="Activo en la agenda" defaultChecked={s.active} />
              <Checkbox id="online_booking_enabled" name="online_booking_enabled" label="Reservable en la web" defaultChecked={s.online_booking_enabled} />
              <p className="text-sm text-muted">Duraciones y profesionales se configuran en cada profesional.</p>
            </fieldset>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <WorkflowPanel
            entity="service"
            id={s.id}
            status={s.status}
            live={Boolean(live)}
            requiresReview
            canReview={staff.can_review_medical}
            canPublishDirect={false}
            back={back}
            previewHref={`/admin/vista-previa/service/${s.id}`}
            livePath={live?.path}
          />
          <RevisionsPanel db={supabase} entity="service" id={s.id} back={back} canRestore={canEdit} />
        </div>
      </div>
    </>
  );
}
