import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";
import { listMediaOptions, MediaSelect } from "@/features/cms/admin/media-select";
import { RevisionsPanel } from "@/features/cms/admin/revisions-panel";
import { WorkflowPanel } from "@/features/cms/admin/workflow-panel";
import { homeSectionsSchema } from "@/features/cms/types";
import { hasRole, requireStaff } from "@/lib/auth/staff";

import { savePage } from "../../actions";
import { PAGE_KINDS } from "../../page-kinds";

export const metadata: Metadata = { title: "Página" };

export default async function PageEditPage({ params }: PageProps<"/admin/contenido/paginas/[id]">) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff(["admin", "editor", "professional"]);
  const [{ data: p }, { data: live }, media] = await Promise.all([
    supabase.from("pages").select("*").eq("id", id).maybeSingle(),
    supabase.from("published_content").select("path").eq("entity_type", "page").eq("entity_id", id).maybeSingle(),
    listMediaOptions(supabase),
  ]);
  if (!p) notFound();
  const meta = PAGE_KINDS[p.kind];
  const sections = homeSectionsSchema.safeParse(p.sections).data ?? {};
  const back = `/admin/contenido/paginas/${id}`;
  return (
    <>
      <PageHeader title={meta?.title ?? p.kind} description={<>Página <DemoBadge demo={p.is_demo} /></>} />
      {meta?.legal ? (
        <Alert tone="warning" className="mb-6" title="Texto legal">
          Debe ser validado por asesoría local antes de publicarse. Cambia la «versión del documento» en cada modificación sustancial: se registra en cada consentimiento.
        </Alert>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Panel title="Contenido">
          <ActionForm action={savePage} submitLabel="Guardar borrador">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="kind" value={p.kind} />
            <Field id="title" label="Título (H1)" required>{(a) => <Input {...a} name="title" defaultValue={p.title} />}</Field>
            <Field id="intro" label="Introducción">{(a) => <Textarea {...a} name="intro" rows={3} maxLength={600} defaultValue={p.intro} />}</Field>
            {p.kind === "home" ? (
              <fieldset className="space-y-4 rounded-2xl border border-line p-4">
                <legend className="px-1 font-semibold">Secciones de portada</legend>
                <Field id="hero_kicker" label="Antetítulo">{(a) => <Input {...a} name="hero_kicker" maxLength={80} defaultValue={sections.hero_kicker ?? ""} />}</Field>
                <Field id="hero_title" label="Título principal">{(a) => <Input {...a} name="hero_title" maxLength={140} defaultValue={sections.hero_title ?? ""} />}</Field>
                <Field id="hero_text" label="Texto principal">{(a) => <Textarea {...a} name="hero_text" rows={3} maxLength={400} defaultValue={sections.hero_text ?? ""} />}</Field>
                <Field id="highlights" label="Destacados (máx. 4)" description="Uno por línea: Título | Texto. Sólo afirmaciones verificables.">
                  {(a) => <Textarea {...a} name="highlights" rows={4} defaultValue={(sections.highlights ?? []).map((h) => `${h.title} | ${h.text}`).join("\n")} />}
                </Field>
                <Field id="facilities_text" label="Texto de instalaciones">{(a) => <Textarea {...a} name="facilities_text" rows={3} maxLength={800} defaultValue={sections.facilities_text ?? ""} />}</Field>
              </fieldset>
            ) : null}
            <Field id="body_md" label="Cuerpo (Markdown)" description="Encabezados con ##. No se permiten scripts ni HTML arbitrario.">{(a) => <Textarea {...a} name="body_md" rows={14} defaultValue={p.body_md} />}</Field>
            {meta?.legal ? <Field id="document_version" label="Versión del documento" description="Ej. 2026-11-v1">{(a) => <Input {...a} name="document_version" maxLength={40} defaultValue={p.document_version ?? ""} />}</Field> : null}
            <fieldset className="space-y-4 rounded-2xl border border-line p-4">
              <legend className="px-1 font-semibold">SEO</legend>
              <Field id="seo_title" label="Título SEO (≤ 70)">{(a) => <Input {...a} name="seo_title" maxLength={70} defaultValue={p.seo_title ?? ""} />}</Field>
              <Field id="seo_description" label="Descripción SEO (≤ 170)">{(a) => <Textarea {...a} name="seo_description" maxLength={170} rows={2} defaultValue={p.seo_description ?? ""} />}</Field>
              <MediaSelect id="og_media_id" name="og_media_id" label={p.kind === "home" ? "Imagen principal y OG" : "Imagen para redes (OG)"} value={p.og_media_id} media={media} />
            </fieldset>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <WorkflowPanel
            entity="page"
            id={p.id}
            status={p.status}
            live={Boolean(live)}
            requiresReview={p.requires_medical_review}
            canReview={staff.can_review_medical}
            canPublishDirect={hasRole(staff, "admin", "editor")}
            back={back}
            previewHref={`/admin/vista-previa/page/${p.id}`}
            livePath={live?.path}
          />
          <RevisionsPanel db={supabase} entity="page" id={p.id} back={back} canRestore={hasRole(staff, "admin", "editor")} />
        </div>
      </div>
    </>
  );
}
