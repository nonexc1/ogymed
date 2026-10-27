import { ServiceList } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Container, EmptyState } from "@/components/ui/surface";
import { getPage, listServices } from "@/features/cms/queries";
import type { Service } from "@/features/cms/types";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPage("services_index");
  return pageMetadata({
    title: page?.seo.title ?? "Servicios ginecológicos en Surco",
    description: page?.seo.description ?? "Servicios de la clínica ginecológica OGYMED en Santiago de Surco, Lima.",
    path: "/servicios",
  });
}

export default async function ServicesPage() {
  const [page, services] = await Promise.all([getPage("services_index"), listServices()]);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Servicios", href: "/servicios" },
  ];
  const groups = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.category ?? "Servicios";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page?.title ?? "Servicios"}</h1>
        {page?.intro ? <p className="mt-4 text-lg text-muted">{page.intro}</p> : null}
      </header>
      <div className="mt-12 space-y-14">
        {services.length === 0 ? (
          <EmptyState title="Catálogo en preparación">
            Estamos revisando con el equipo médico la información de cada servicio. Mientras tanto, puedes contactarnos.
          </EmptyState>
        ) : (
          [...groups.entries()].map(([category, items]) => (
            <section key={category} aria-labelledby={`cat-${category}`}>
              {groups.size > 1 ? (
                <h2 id={`cat-${category}`} className="mb-4 text-2xl">
                  {category}
                </h2>
              ) : null}
              <ServiceList services={items} />
            </section>
          ))
        )}
      </div>
    </Container>
  );
}
