import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Prose } from "@/components/site/prose";
import { ReviewNote } from "@/components/site/blocks";
import { Container } from "@/components/ui/surface";
import { renderMarkdown } from "@/features/cms/markdown";
import { getPage } from "@/features/cms/queries";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function cmsPageMetadata(kind: string, path: string, fallbackTitle: string) {
  const page = await getPage(kind);
  if (!page) return { title: fallbackTitle, robots: { index: false } };
  return pageMetadata({ title: page.seo.title ?? page.title, description: page.seo.description ?? page.intro, path, image: page.seo.og });
}

/** Página editorial genérica. Si no está publicada, 404 (no se publican páginas vacías). */
export async function CmsPage({ kind, path, children }: { kind: string; path: string; children?: React.ReactNode }) {
  const page = await getPage(kind);
  if (!page) notFound();
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: page.title, href: path },
  ];
  const isLegal = ["privacy", "cookies", "terms", "booking_policy", "complaints"].includes(kind);
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page.title}</h1>
        {page.intro ? <p className="mt-4 text-lg text-muted">{page.intro}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <ReviewNote reviewedAt={page.medical_reviewed_at} />
          {isLegal && page.document_version ? (
            <p className="text-sm text-muted">
              Versión {page.document_version} · actualizada el{" "}
              {new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(new Date(page.updatedAt))}
            </p>
          ) : null}
        </div>
      </header>
      <Prose html={renderMarkdown(page.body_md)} className="mt-10" />
      {children}
    </Container>
  );
}
