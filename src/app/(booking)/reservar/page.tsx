import type { Metadata } from "next";

import { ContactActions } from "@/components/site/blocks";
import { Alert, Card, Container } from "@/components/ui/surface";
import { BookingWizard } from "@/features/booking/booking-wizard";
import { getOfferings, getPrivacyVersion, getSettings, listDoctors, listServices } from "@/features/cms/queries";
import { ContactForm } from "@/features/contact/contact-form";
import { bookingInfraReady } from "@/lib/env.server";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privateMetadata("Reservar cita");

export default async function BookPage({ searchParams }: PageProps<"/reservar">) {
  const sp = await searchParams;
  const [settings, services, doctors, offerings, privacyVersion] = await Promise.all([
    getSettings(),
    listServices(),
    listDoctors(),
    getOfferings(),
    getPrivacyVersion(),
  ]);
  const online = offerings.filter((o) => o.online_booking);
  const bookableServices = services.filter((s) => online.some((o) => o.service_id === s.id));
  const agendaReady =
    settings.booking_mode !== "off" && bookingInfraReady && Boolean(privacyVersion) && bookableServices.length > 0;

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const initialService = bookableServices.find((s) => s.slug === one(sp.servicio)) ?? null;
  const initialDoctor = doctors.find((d) => d.slug === one(sp.profesional)) ?? null;

  if (!agendaReady) {
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl sm:text-5xl">Solicitar cita</h1>
          <p className="mt-4 text-lg text-muted">
            Por ahora coordinamos las citas a través de recepción. Envíanos tu solicitud y te contactaremos para acordar el
            día y la hora. <strong>Tu cita no queda confirmada hasta que recepción te lo indique.</strong>
          </p>
          <ContactActions settings={settings} bookingLabel="Solicitar cita" position="section" className="mt-6" showBooking={false} />
          <Card className="mt-10">
            <h2 className="text-2xl">Formulario de solicitud</h2>
            <div className="mt-4">
              {privacyVersion ? (
                <ContactForm defaultTopic="cita" />
              ) : (
                <Alert tone="info" title="Formulario no disponible todavía">
                  Se habilitará cuando la política de privacidad esté publicada. Mientras tanto, contáctanos por teléfono o
                  WhatsApp.
                </Alert>
              )}
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="sr-only">Reservar cita</h1>
      <BookingWizard
        mode={settings.booking_mode as "reception" | "automatic"}
        services={bookableServices.map((s) => ({ id: s.id, slug: s.slug, name: s.name, summary: s.summary }))}
        doctors={doctors.map((d) => ({ id: d.id, slug: d.slug, name: d.display_name, specialty: d.specialty ?? null }))}
        offerings={online.map((o) => ({ doctor_id: o.doctor_id, service_id: o.service_id }))}
        initialServiceId={initialService?.id ?? null}
        initialDoctorId={initialDoctor?.id ?? null}
        whatsapp={settings.whatsapp_e164}
        phone={settings.phone_e164}
      />
    </Container>
  );
}
