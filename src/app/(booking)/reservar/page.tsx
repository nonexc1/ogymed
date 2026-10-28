import type { Metadata } from "next";

import { ChannelButtons } from "@/components/site/channel-buttons";
import { addressText, OpeningHours } from "@/components/site/opening-hours";
import { Card, Container } from "@/components/ui/surface";
import { BookingWizard } from "@/features/booking/booking-wizard";
import { listDoctors } from "@/features/cms/queries";
import { contactChannels, getRequestState } from "@/features/cms/request-state";
import { ContactForm } from "@/features/contact/contact-form";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privateMetadata("Pedir cita");

export default async function BookPage({ searchParams }: PageProps<"/reservar">) {
  const sp = await searchParams;
  const [request, doctors] = await Promise.all([getRequestState(), listDoctors()]);
  const { settings, online, bookableServices } = request;
  const channels = contactChannels(settings);

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const initialService = bookableServices.find((s) => s.slug === one(sp.servicio)) ?? null;
  const initialDoctor = doctors.find((d) => d.slug === one(sp.profesional)) ?? null;

  if (!request.agendaReady) {
    const address = addressText(settings);
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
          <div>
            <h1 className="text-4xl sm:text-5xl">Solicitar cita</h1>
            {request.kind === "form" ? (
              <p className="mt-4 text-lg text-muted">
                Envíanos tu solicitud y recepción te contactará para acordar el día y la hora.{" "}
                <strong>Tu cita no queda confirmada hasta que recepción te lo indique.</strong>
              </p>
            ) : (
              <p className="mt-4 text-lg text-muted">
                Estamos habilitando la solicitud de citas en línea.{" "}
                {channels.length
                  ? "Mientras tanto, puedes coordinar tu cita directamente con recepción:"
                  : "Muy pronto podrás pedir tu cita desde esta página."}
              </p>
            )}
            <ChannelButtons channels={channels} position="section" className="mt-6" />
            {request.kind === "form" ? (
              <Card className="mt-10">
                <h2 className="text-2xl">Formulario de solicitud</h2>
                <div className="mt-4">
                  <ContactForm defaultTopic="cita" />
                </div>
              </Card>
            ) : null}
          </div>
          <aside aria-labelledby="pedimos-title" className="h-fit rounded-[var(--radius-card)] bg-sand p-6">
            <h2 id="pedimos-title" className="font-sans text-lg font-semibold text-ink">
              Qué te pedimos
            </h2>
            <ul className="mt-3 space-y-3 text-muted">
              <li>Solo tu nombre y un medio de contacto.</li>
              <li>No necesitas crear una cuenta ni recordar contraseñas.</li>
              <li>No incluyas síntomas ni datos médicos: eso se conversa en la consulta.</li>
            </ul>
            <h2 className="mt-6 font-sans text-lg font-semibold text-ink">Dónde estamos</h2>
            <address className="mt-2 not-italic text-muted">{address ?? `${settings.district}, ${settings.city}`}</address>
            {settings.opening_hours.length ? (
              <div className="mt-3 text-muted">
                <OpeningHours settings={settings} />
              </div>
            ) : null}
          </aside>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="sr-only">{request.label}</h1>
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
