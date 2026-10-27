import { DoctorCard } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Container, EmptyState } from "@/components/ui/surface";
import { getPage, listDoctors } from "@/features/cms/queries";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPage("team_index");
  return pageMetadata({
    title: page?.seo.title ?? "Equipo médico",
    description: page?.seo.description ?? "Profesionales de OGYMED, clínica ginecológica en Santiago de Surco.",
    path: "/equipo",
  });
}

export default async function TeamPage() {
  const [page, doctors] = await Promise.all([getPage("team_index"), listDoctors()]);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Equipo", href: "/equipo" },
  ];
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page?.title ?? "Equipo"}</h1>
        {page?.intro ? <p className="mt-4 text-lg text-muted">{page.intro}</p> : null}
      </header>
      {doctors.length ? (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((d) => (
            <li key={d.id}>
              <DoctorCard doctor={d} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Perfiles en preparación">Publicaremos los perfiles cuando sus credenciales estén verificadas.</EmptyState>
      )}
    </Container>
  );
}
