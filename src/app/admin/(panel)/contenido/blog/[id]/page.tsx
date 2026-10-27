import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";
import { doctorLabel, listDoctorsAdmin, listServicesAdmin } from "@/features/admin/data";
import { listMediaOptions, MediaSelect } from "@/features/cms/admin/media-select";
import { RevisionsPanel } from "@/features/cms/admin/revisions-panel";
import { WorkflowPanel } from "@/features/cms/admin/workflow-panel";
import { hasRole, requireStaff } from "@/lib/auth/staff";

import { savePost } from "../../actions";

export const metadata: Metadata = { title: "Artículo" };

type Ref = { title: string; url?: string; publisher?: string; year?: number };

export default async function PostEditPage({ params }: PageProps<"/admin/contenido/blog/[id]">) {
  const { id } = await params;
  const { supabase, staff } = await requireStaff(["admin", "editor", "professional"]);
  const [{ data: p }, { data: live }, doctors, services, media] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    supabase.from("published_content").select("path").eq("entity_type", "post").eq("entity_id", id).maybeSingle(),
    listDoctorsAdmin(supabase),
    listServicesAdmin(supabase),
    listMediaOptions(supabase),
  ]);
  if (!p) notFound();
  const back = `/admin/contenido/blog/${id}`;
  return (
    <>
      <PageHeader title={p.title} description={<>Artículo <DemoBadge demo={p.is_demo} /></>} />
      <Alert tone="info" className="mb-6" title="Contenido médico">
        Autor y revisor identificados, fuentes verificables y lenguaje equilibrado. Los borradores asistidos por IA deben pasar revisión médica; no se publican recomendaciones personalizadas ni promesas de resultados.
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Panel title="Contenido">
          <ActionForm action={savePost} submitLabel="Guardar borrador">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="Título" required className="sm:col-span-2">{(a) => <Input {...a} name="title" defaultValue={p.title} />}</Field>
              <Field id="slug" label="Slug" required>{(a) => <Input {...a} name="slug" defaultValue={p.slug} />}</Field>
            </div>
            <Field id="excerpt" label="Extracto">{(a) => <Textarea {...a} name="excerpt" rows={2} maxLength={400} defaultValue={p.excerpt} />}</Field>
            <Field id="body_md" label="Cuerpo (Markdown)">{(a) => <Textarea {...a} name="body_md" rows={16} defaultValue={p.body_md} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="author_doctor_id" label="Autor (profesional)">
                {(a) => (
                  <Select {...a} name="author_doctor_id" defaultValue={p.author_doctor_id ?? ""}>
                    <option value="">— (usar nombre)</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{doctorLabel(d)}</option>)}
                  </Select>
                )}
              </Field>
              <Field id="author_name" label="Autor (nombre)">{(a) => <Input {...a} name="author_name" defaultValue={p.author_name ?? ""} />}</Field>
              <Field id="reviewer_doctor_id" label="Revisor médico" description="Profesional con perfil publicado.">
                {(a) => (
                  <Select {...a} name="reviewer_doctor_id" defaultValue={p.reviewer_doctor_id ?? ""}>
                    <option value="">Elegir…</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{doctorLabel(d)}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <Field id="references" label="Referencias" description="Una por línea: Título | URL | Editorial | Año">
              {(a) => <Textarea {...a} name="references" rows={4} defaultValue={((p.references_list ?? []) as Ref[]).map((r) => [r.title, r.url ?? "", r.publisher ?? "", r.year ?? ""].join(" | ")).join("\n")} />}
            </Field>
            <fieldset>
              <legend className="mb-2 font-semibold">Servicios relacionados</legend>
              <div className="flex flex-wrap gap-4">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input type="checkbox" name="related_service_ids" value={s.id} defaultChecked={(p.related_service_ids ?? []).includes(s.id)} className="size-5 accent-plum" />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <MediaSelect id="cover_media_id" name="cover_media_id" label="Imagen de portada" value={p.cover_media_id} media={media} />
            <fieldset className="space-y-4 rounded-2xl border border-line p-4">
              <legend className="px-1 font-semibold">SEO</legend>
              <Field id="seo_title" label="Título SEO (≤ 70)">{(a) => <Input {...a} name="seo_title" maxLength={70} defaultValue={p.seo_title ?? ""} />}</Field>
              <Field id="seo_description" label="Descripción SEO (≤ 170)">{(a) => <Textarea {...a} name="seo_description" maxLength={170} rows={2} defaultValue={p.seo_description ?? ""} />}</Field>
              <MediaSelect id="og_media_id" name="og_media_id" label="Imagen para redes (OG)" value={p.og_media_id} media={media} />
            </fieldset>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <WorkflowPanel entity="post" id={p.id} status={p.status} live={Boolean(live)} requiresReview canReview={staff.can_review_medical} canPublishDirect={false} back={back} previewHref={`/admin/vista-previa/post/${p.id}`} livePath={live?.path} />
          <RevisionsPanel db={supabase} entity="post" id={p.id} back={back} canRestore={hasRole(staff, "admin", "editor")} />
        </div>
      </div>
    </>
  );
}
