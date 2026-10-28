import { notFound } from "next/navigation";

import { ClinicView } from "@/components/site/clinic-view";
import { cmsPageMetadata } from "@/components/site/cms-page";
import { JsonLd } from "@/components/site/json-ld";
import { photoFrom } from "@/components/site/photo";
import { homeFacts } from "@/features/cms/home";
import { getPage } from "@/features/cms/queries";
import { getRequestState } from "@/features/cms/request-state";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("clinic", "/la-clinica", "La clínica");

export default async function ClinicPage() {
  const [page, request] = await Promise.all([getPage("clinic"), getRequestState()]);
  if (!page) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", href: "/" },
          { name: page.title, href: "/la-clinica" },
        ])}
      />
      <ClinicView
        page={page}
        settings={request.settings}
        facts={homeFacts(request.settings, request.kind, request.label)}
        bookingLabel={request.label}
        canRequest={request.kind !== "none"}
        photo={photoFrom(page.seo.og)}
      />
    </>
  );
}
