import { TrackedLink } from "@/components/analytics/tracked-link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ChannelButtons } from "@/components/site/channel-buttons";
import { HomeLocation } from "@/components/site/home/more-sections";
import { JsonLd } from "@/components/site/json-ld";
import { photoFrom } from "@/components/site/photo";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/surface";
import { getPage } from "@/features/cms/queries";
import { contactChannels, getRequestState } from "@/features/cms/request-state";
import { ContactForm } from "@/features/contact/contact-form";
import { breadcrumbJsonLd, clinicJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPage("contact");
  return pageMetadata({
    title: page?.seo.title ?? "Contacto y ubicación en Santiago de Surco",
    description: page?.seo.description ?? "Cómo contactar a OGYMED, clínica ginecológica en Santiago de Surco, Lima, y cómo llegar.",
    path: "/contacto",
  });
}

export default async function ContactPage() {
  const [page, request] = await Promise.all([getPage("contact"), getRequestState()]);
  const { settings } = request;
  const channels = contactChannels(settings);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Contacto", href: "/contacto" },
  ];
  const formAvailable = Boolean(request.privacyVersion);
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs), clinicJsonLd(settings)]} />
      <section aria-labelledby="contacto-h1" className="bg-sand">
        <div className="mx-auto w-full max-w-[76rem] px-5 pb-14 pt-8 sm:px-8 sm:pt-10 lg:pb-16">
          <Breadcrumbs items={crumbs} />
          <h1 id="contacto-h1" className="mt-10 text-[2.8rem] leading-[1.04] tracking-[-0.02em] sm:text-[4rem]">
            {page?.title ?? "Contacto"}
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-muted">{page?.intro || `Estamos en ${settings.district}, ${settings.city}.`}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {request.kind !== "none" ? (
              <TrackedLink event="click_book" position="contact" href="/reservar" className={buttonVariants({ size: "lg" })}>
                {request.label}
              </TrackedLink>
            ) : null}
            <ChannelButtons channels={channels} position="contact" className="contents" />
          </div>
        </div>
      </section>
      <HomeLocation settings={settings} photo={photoFrom(page?.seo.og)} title="Dónde estamos" />
      <section aria-labelledby="escribenos-title" className="mx-auto grid w-full max-w-[76rem] gap-10 px-5 pb-24 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <h2 id="escribenos-title" className="text-[2.2rem] leading-[1.08] sm:text-[2.6rem]">
            Escríbenos
          </h2>
          <p className="mt-4 text-lg text-muted">Recepción te responderá por el medio que indiques.</p>
        </div>
        <Card className="lg:col-span-8">
          {formAvailable ? (
            <ContactForm />
          ) : (
            <Alert tone="info" title="Formulario disponible próximamente">
              {channels.length
                ? "Mientras tanto, puedes comunicarte con nosotros por los canales indicados en esta página."
                : "Estamos habilitando este canal. Vuelve pronto."}
            </Alert>
          )}
        </Card>
      </section>
    </>
  );
}
