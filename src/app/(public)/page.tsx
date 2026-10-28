import type { Metadata } from "next";

import { JsonLd } from "@/components/site/json-ld";
import { HomeView } from "@/components/site/home/home-view";
import { getHomeData } from "@/features/cms/home";
import { getPage } from "@/features/cms/queries";
import { clinicJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return {
    ...pageMetadata({
      title: page?.seo.title ?? "Clínica ginecológica en Santiago de Surco",
      description:
        page?.seo.description ??
        "OGYMED, clínica ginecológica en Santiago de Surco, Lima. Información de servicios, equipo y reserva de citas.",
      path: "/",
      image: page?.seo.og,
    }),
    title: { absolute: page?.seo.title ?? "OGYMED · Clínica ginecológica en Santiago de Surco, Lima" },
  };
}

export default async function HomePage() {
  const data = await getHomeData();
  return (
    <>
      <JsonLd data={clinicJsonLd(data.settings)} />
      <HomeView data={data} />
    </>
  );
}
