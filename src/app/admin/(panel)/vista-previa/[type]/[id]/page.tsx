import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader, Panel } from "@/components/admin/ui";
import { Prose } from "@/components/site/prose";
import { Alert } from "@/components/ui/surface";
import { renderMarkdown } from "@/features/cms/markdown";
import { requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

const TABLE: Record<string, string> = { service: "services", doctor: "doctors", page: "pages", post: "posts" };

/** Previsualización autenticada (noindex) de la copia de trabajo, con el mismo render sanitizado. */
export default async function PreviewPage({ params }: PageProps<"/admin/vista-previa/[type]/[id]">) {
  const { type, id } = await params;
  const { supabase } = await requireStaff(["admin", "editor", "professional"]);
  const table = TABLE[type];
  if (!table) notFound();
  const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const title = data.name ?? data.title ?? data.full_name;
  const sections: [string, string | undefined][] =
    type === "service"
      ? [["", data.body_md], ["¿A quién se dirige?", data.audience_md], ["Qué esperar", data.what_to_expect_md], ["Preparación", data.preparation_md]]
      : type === "doctor"
        ? [["", data.bio_md], ["Trayectoria", data.background_md]]
        : [["", data.body_md]];
  return (
    <>
      <PageHeader title={`Vista previa: ${title}`} />
      <Alert tone="warning" className="mb-6">Borrador no publicado. Esta vista sólo es visible para el personal y no se indexa.</Alert>
      <Panel>
        <article className="mx-auto max-w-3xl">
          <h1 className="text-4xl">{title}</h1>
          {data.summary || data.intro || data.excerpt ? <p className="mt-4 text-lg text-muted">{data.summary || data.intro || data.excerpt}</p> : null}
          {sections.filter(([, md]) => md?.trim()).map(([heading, md]) => (
            <section key={heading} className="mt-8">
              {heading ? <h2 className="text-2xl">{heading}</h2> : null}
              <Prose html={renderMarkdown(md)} className="mt-3" />
            </section>
          ))}
        </article>
      </Panel>
    </>
  );
}
