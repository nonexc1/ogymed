import type { Metadata } from "next";

import { BookingSteps, ContactActions, DoctorCard, FaqList, LocationCard, ServiceList } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/json-ld";
import { MediaImage } from "@/components/site/media-image";
import { Prose } from "@/components/site/prose";
import { SiteLink } from "@/components/site/site-link";
import { Container, SectionHeading } from "@/components/ui/surface";
import { renderMarkdown } from "@/features/cms/markdown";
import { getPage, getSettings, listDoctors, listFaqs, listServices } from "@/features/cms/queries";
import { homeSectionsSchema } from "@/features/cms/types";
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
  const [page, settings, services, doctors, faqs] = await Promise.all([
    getPage("home"),
    getSettings(),
    listServices(),
    listDoctors(),
    listFaqs(),
  ]);
  const sections = homeSectionsSchema.safeParse(page?.sections ?? {}).data ?? {};
  const bookingLabel = settings.booking_mode === "off" ? "Solicitar cita" : "Reservar cita";
  const heroImage = page?.seo.og ?? null;
  const featuredFaqs = faqs.filter((f) => f.category === "reservas" || f.category === "general").slice(0, 4);

  return (
    <>
      <JsonLd data={clinicJsonLd(settings)} />

      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 size-[34rem] rounded-full bg-rose/50 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-24 size-[28rem] rounded-full bg-sage-soft blur-3xl" />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-sage-strong">
              {sections.hero_kicker ?? "Clínica ginecológica · Santiago de Surco"}
            </p>
            <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-6xl">
              {sections.hero_title ?? page?.title ?? "Atención ginecológica en Santiago de Surco, Lima"}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
              {sections.hero_text ??
                page?.intro ??
                (settings.booking_mode === "off"
                  ? "Solicita tu cita y recepción coordinará contigo el horario."
                  : "Consulta la disponibilidad real y reserva tu cita en línea, sin crear una cuenta.")}
            </p>
            <ContactActions settings={settings} bookingLabel={bookingLabel} position="hero" className="mt-8" />
          </div>
          {heroImage ? (
            <MediaImage
              media={heroImage}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl"
            />
          ) : (
            <div aria-hidden="true" className="hidden h-full min-h-80 rounded-[2rem] border border-line bg-paper/70 p-10 lg:block">
              <div className="flex h-full flex-col justify-end gap-3">
                <span className="h-3 w-24 rounded-full bg-rose" />
                <span className="h-3 w-40 rounded-full bg-sage-soft" />
                <span className="font-display text-7xl text-plum/15">OGYMED</span>
              </div>
            </div>
          )}
        </Container>
      </section>

      {sections.highlights?.length ? (
        <section aria-label="Lo que nos define" className="border-y border-line bg-paper">
          <Container className="grid gap-8 py-12 md:grid-cols-3">
            {sections.highlights.map((h) => (
              <div key={h.title}>
                <h2 className="font-sans text-lg font-semibold text-ink">{h.title}</h2>
                <p className="mt-1 text-muted">{h.text}</p>
              </div>
            ))}
          </Container>
        </section>
      ) : null}

      {services.length ? (
        <section aria-labelledby="servicios-title">
          <Container className="py-20">
            <SectionHeading id="servicios-title" eyebrow="Servicios" title="¿En qué podemos ayudarte?" />
            <ServiceList services={services.slice(0, 8)} />
            <SiteLink href="/servicios" className="mt-8 inline-flex font-semibold text-plum underline underline-offset-4">
              Ver todos los servicios
            </SiteLink>
          </Container>
        </section>
      ) : null}

      {doctors.length ? (
        <section aria-labelledby="equipo-title" className="bg-plum-soft/60">
          <Container className="py-20">
            <SectionHeading id="equipo-title" eyebrow="Equipo" title="Profesionales que te atienden" />
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {doctors.slice(0, 4).map((d) => (
                <li key={d.id}>
                  <DoctorCard doctor={d} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="reserva-title">
        <Container className="py-20">
          <SectionHeading
            id="reserva-title"
            eyebrow="Cómo reservar"
            title={settings.booking_mode === "off" ? "Solicita tu cita en tres pasos" : "Reserva en tres pasos"}
          />
          <BookingSteps mode={settings.booking_mode} hasWhatsapp={Boolean(settings.whatsapp_e164)} />
        </Container>
      </section>

      {sections.facilities_text || page?.body_md ? (
        <section aria-labelledby="clinica-title" className="border-y border-line bg-paper">
          <Container className="py-20">
            <SectionHeading id="clinica-title" eyebrow="La clínica" title="Nuestra sede en Surco" intro={sections.facilities_text} />
            <Prose html={renderMarkdown(page?.body_md)} />
          </Container>
        </section>
      ) : null}

      {featuredFaqs.length ? (
        <section aria-labelledby="faq-title">
          <Container className="py-20">
            <SectionHeading id="faq-title" eyebrow="Preguntas frecuentes" title="Antes de tu visita" />
            <FaqList faqs={featuredFaqs} />
            <SiteLink href="/preguntas-frecuentes" className="mt-6 inline-flex font-semibold text-plum underline underline-offset-4">
              Ver todas las preguntas
            </SiteLink>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="ubicacion-title">
        <Container className="grid gap-10 py-20 md:grid-cols-2">
          <div>
            <SectionHeading id="ubicacion-title" eyebrow="Ubicación" title={`Estamos en ${settings.district}`} />
            <ContactActions settings={settings} bookingLabel={bookingLabel} position="section" />
          </div>
          <LocationCard settings={settings} position="section" />
        </Container>
      </section>
    </>
  );
}
