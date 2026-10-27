import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MediaImage } from "@/components/site/media-image";
import { SiteLink } from "@/components/site/site-link";
import { Container, EmptyState } from "@/components/ui/surface";
import { getPage, listPosts } from "@/features/cms/queries";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPage("blog_index");
  return pageMetadata({
    title: page?.seo.title ?? "Blog de salud ginecológica",
    description: page?.seo.description ?? "Artículos educativos revisados por el equipo médico de OGYMED.",
    path: "/blog",
  });
}

const fmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" });

export default async function BlogPage() {
  const [page, posts] = await Promise.all([getPage("blog_index"), listPosts()]);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Blog", href: "/blog" },
  ];
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page?.title ?? "Blog"}</h1>
        <p className="mt-4 text-lg text-muted">
          {page?.intro ?? "Información educativa general. No sustituye una consulta médica."}
        </p>
      </header>
      {posts.length ? (
        <ul className="mt-12 grid gap-10 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id}>
              <article>
                {p.cover ? (
                  <MediaImage media={p.cover} sizes="(min-width: 768px) 45vw, 100vw" className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover" />
                ) : null}
                <h2 className="text-2xl">
                  <SiteLink href={p.path} className="hover:text-plum">
                    {p.title}
                  </SiteLink>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  <time dateTime={p.publishedAt}>{fmt.format(new Date(p.publishedAt))}</time>
                  {p.reviewer?.name ? ` · Revisado por ${p.reviewer.name}` : ""}
                </p>
                {p.excerpt ? <p className="mt-2 text-muted">{p.excerpt}</p> : null}
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aún no hay artículos publicados">
          Los artículos se publican sólo después de la revisión del equipo médico.
        </EmptyState>
      )}
    </Container>
  );
}
