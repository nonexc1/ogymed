import { ContactActions, LocationCard } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { VoluntaryMap } from "@/components/site/voluntary-map";
import { addressText } from "@/components/site/opening-hours";
import { Alert, Card, Container } from "@/components/ui/surface";
import { getPage, getSettings } from "@/features/cms/queries";
import { ContactForm } from "@/features/contact/contact-form";
import { breadcrumbJsonLd, clinicJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPage("contact");
  return pageMetadata({
    title: page?.seo.title ?? "Contacto y ubicación en Santiago de Surco",
    description: page?.seo.description ?? "Dirección, horarios, teléfono y WhatsApp de OGYMED en Santiago de Surco, Lima.",
    path: "/contacto",
  });
}

export default async function ContactPage() {
  const [page, settings, privacy] = await Promise.all([getPage("contact"), getSettings(), getPage("privacy")]);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Contacto", href: "/contacto" },
  ];
  const bookingLabel = settings.booking_mode === "off" ? "Solicitar cita" : "Reservar cita";
  const hasCoords = settings.latitude !== null && settings.longitude !== null;
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={[breadcrumbJsonLd(crumbs), clinicJsonLd(settings)]} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page?.title ?? "Contacto"}</h1>
        <p className="mt-4 text-lg text-muted">
          {page?.intro || `Estamos en ${settings.district}, ${settings.city}. Escríbenos, llámanos o reserva en línea.`}
        </p>
      </header>
      <ContactActions settings={settings} bookingLabel={bookingLabel} position="contact" className="mt-8" />
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-2xl">Dónde estamos</h2>
          <LocationCard settings={settings} position="contact" />
          {hasCoords ? (
            <VoluntaryMap latitude={settings.latitude!} longitude={settings.longitude!} label={addressText(settings) ?? settings.clinic_name} />
          ) : null}
        </div>
        <Card>
          <h2 className="text-2xl">Escríbenos</h2>
          <div className="mt-4">
            {privacy?.document_version ? (
              <ContactForm />
            ) : (
              <Alert tone="info" title="Formulario no disponible todavía">
                El formulario se habilitará cuando la política de privacidad esté publicada. Mientras tanto, contáctanos por
                teléfono o WhatsApp.
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}
