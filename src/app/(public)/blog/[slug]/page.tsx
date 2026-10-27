import { notFound } from "next/navigation";

import { ReviewNote } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MediaImage } from "@/components/site/media-image";
import { Prose } from "@/components/site/prose";
import { SiteLink } from "@/components/site/site-link";
import { Alert, Container } from "@/components/ui/surface";
import { plainText, renderMarkdown } from "@/features/cms/markdown";
import { getPost, getSettings, listPosts, listServices } from "@/features/cms/queries";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Artículo no encontrado", robots: { index: false } };
  return pageMetadata({
    title: post.seo.title ?? post.title,
    description: post.seo.description ?? (post.excerpt || plainText(post.body_md)),
    path: post.path,
    image: post.seo.og ?? post.cover,
    type: "article",
  });
}

const fmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" });

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const [settings, services] = await Promise.all([getSettings(), listServices()]);
  const related = services.filter((s) => post.related_service_ids.includes(s.id));
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: post.title, href: post.path },
  ];
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={[breadcrumbJsonLd(crumbs), ...articleJsonLd(post, settings)]} />
      <Breadcrumbs items={crumbs} />
      <article className="mx-auto mt-8 max-w-3xl">
        <header>
          <h1 className="text-4xl sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-muted">
            {post.author?.name ? (
              <>
                Por{" "}
                {post.author.slug ? (
                  <SiteLink href={`/equipo/${post.author.slug}`} className="text-plum underline underline-offset-4">
                    {post.author.name}
                  </SiteLink>
                ) : (
                  post.author.name
                )}{" "}
                ·{" "}
              </>
            ) : null}
            Publicado el <time dateTime={post.publishedAt}>{fmt.format(new Date(post.publishedAt))}</time>
            {post.updatedAt !== post.publishedAt ? (
              <>
                {" "}· Actualizado el <time dateTime={post.updatedAt}>{fmt.format(new Date(post.updatedAt))}</time>
              </>
            ) : null}
          </p>
          <div className="mt-3">
            <ReviewNote reviewedAt={post.medical_reviewed_at} reviewer={post.reviewer?.name} />
          </div>
        </header>
        {post.cover ? (
          <MediaImage media={post.cover} priority sizes="(min-width: 768px) 768px, 100vw" className="mt-8 w-full rounded-[var(--radius-card)] object-cover" />
        ) : null}
        <Prose html={renderMarkdown(post.body_md)} className="mt-8" />
        <Alert tone="info" className="mt-10" title="Información general">
          Este contenido es educativo y no reemplaza una evaluación médica personalizada.
        </Alert>
        {post.references.length ? (
          <section aria-labelledby="referencias" className="mt-10">
            <h2 id="referencias" className="text-2xl">
              Referencias
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted">
              {post.references.map((r, i) => (
                <li key={i}>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="text-plum underline underline-offset-4">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                  {r.publisher ? `. ${r.publisher}` : ""}
                  {r.year ? `, ${r.year}` : ""}.
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {related.length ? (
          <section aria-labelledby="relacionados" className="mt-10">
            <h2 id="relacionados" className="text-2xl">
              Servicios relacionados
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {related.map((s) => (
                <li key={s.id}>
                  <SiteLink href={s.path} className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-plum hover:border-plum">
                    {s.name}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </Container>
  );
}
