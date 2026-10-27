import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/admin/action-form";
import { ContentStatus, DemoBadge, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";
import { hasRole, requireStaff } from "@/lib/auth/staff";

import { createPage, createPost } from "./actions";
import { PAGE_KINDS } from "./page-kinds";

export const metadata: Metadata = { title: "Contenido" };

export default async function ContentIndexPage() {
  const { supabase, staff } = await requireStaff(["admin", "editor", "professional"]);
  const canEdit = hasRole(staff, "admin", "editor");
  const [{ data: pages }, { data: posts }, { data: live }, { count: faqCount }] = await Promise.all([
    supabase.from("pages").select("id, kind, title, status, is_demo"),
    supabase.from("posts").select("id, title, slug, status, is_demo, updated_at").order("updated_at", { ascending: false }),
    supabase.from("published_content").select("entity_id"),
    supabase.from("faqs").select("id", { count: "exact", head: true }),
  ]);
  const liveIds = new Set((live ?? []).map((l) => l.entity_id));
  const byKind = new Map((pages ?? []).map((p) => [p.kind, p]));
  return (
    <>
      <PageHeader title="Contenido" description="Páginas, preguntas frecuentes y blog. Todo se edita como borrador y se publica explícitamente." />
      <div className="space-y-6">
        <Panel title="Páginas">
          <Table>
            <thead><tr><th scope="col">Página</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {Object.entries(PAGE_KINDS).map(([kind, meta]) => {
                const p = byKind.get(kind);
                return (
                  <tr key={kind}>
                    <td>
                      {p ? <Link href={`/admin/contenido/paginas/${p.id}`} className="font-semibold text-plum underline-offset-4 hover:underline">{meta.title}</Link> : meta.title}{" "}
                      {p ? <DemoBadge demo={p.is_demo} /> : null}
                      {meta.review ? <span className="block text-xs text-muted">Requiere revisión médica</span> : null}
                      {meta.legal ? <span className="block text-xs text-muted">Texto legal: requiere validación de asesoría</span> : null}
                    </td>
                    <td>{p ? <ContentStatus status={p.status} live={liveIds.has(p.id)} /> : <span className="text-muted">No creada</span>}</td>
                    <td>
                      {!p && canEdit ? (
                        <ActionForm action={createPage} submitLabel="Crear borrador" submitVariant="secondary" inline>
                          <input type="hidden" name="kind" value={kind} />
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Preguntas frecuentes" actions={<Link href="/admin/contenido/faqs" className="font-semibold text-plum underline">Gestionar ({faqCount ?? 0})</Link>}>
          <p className="text-muted">Sólo aspectos operativos reales (reservas, pagos, ubicación, visita).</p>
        </Panel>
        <Panel title="Blog">
          <Table>
            <thead><tr><th scope="col">Artículo</th><th scope="col">Estado</th></tr></thead>
            <tbody>
              {(posts ?? []).map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/contenido/blog/${p.id}`} className="font-semibold text-plum underline-offset-4 hover:underline">{p.title}</Link> <DemoBadge demo={p.is_demo} /></td>
                  <td><ContentStatus status={p.status} live={liveIds.has(p.id)} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {canEdit ? (
            <div className="mt-6 border-t border-line pt-4">
              <ActionForm action={createPost} submitLabel="Crear artículo (borrador)" submitVariant="secondary">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="post-title" label="Título">{(a) => <Input {...a} name="title" />}</Field>
                  <Field id="post-slug" label="Slug">{(a) => <Input {...a} name="slug" />}</Field>
                </div>
              </ActionForm>
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
