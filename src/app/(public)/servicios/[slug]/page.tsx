import { CalendarCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { DoctorChip, ReviewNote, ServiceFaqs } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MediaImage } from "@/components/site/media-image";
import { Prose } from "@/components/site/prose";
import { buttonVariants } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/surface";
import { plainText, renderMarkdown } from "@/features/cms/markdown";
import { doctorsForService, getOfferings, getService, getSettings, listServices } from "@/features/cms/queries";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicios/[slug]">) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Servicio no encontrado", robots: { index: false } };
  return pageMetadata({
    title: service.seo.title ?? `${service.name} en Surco`,
    description: service.seo.description ?? (service.summary || plainText(service.body_md)),
    path: service.path,
    image: service.seo.og ?? service.hero,
  });
}

const fmtPen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

export default async function ServicePage({ params }: PageProps<"/servicios/[slug]">) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const [doctors, offerings, settings] = await Promise.all([doctorsForService(service.id), getOfferings(), getSettings()]);
  const bookable = settings.booking_mode !== "off" && offerings.some((o) => o.service_id === service.id && o.online_booking);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Servicios", href: "/servicios" },
    { name: service.name, href: service.path },
  ];
  const sections = [
    { id: "a-quien", title: "¿A quién se dirige?", md: service.audience_md },
    { id: "que-esperar", title: "Qué esperar", md: service.what_to_expect_md },
    { id: "preparacion", title: "Preparación", md: service.preparation_md },
  ].filter((s) => s.md.trim());
  const duration = service.duration?.min
    ? service.duration.min === service.duration.max
      ? `${service.duration.min} minutos`
      : `${service.duration.min}–${service.duration.max} minutos`
    : null;

  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <article>
          <header>
            <h1 className="text-4xl sm:text-5xl">{service.name}</h1>
            {service.summary ? <p className="mt-4 max-w-2xl text-lg text-muted">{service.summary}</p> : null}
            <div className="mt-4">
              <ReviewNote reviewedAt={service.medical_reviewed_at} reviewer={service.medical_reviewer} />
            </div>
          </header>
          {service.hero ? (
            <MediaImage media={service.hero} priority sizes="(min-width: 1024px) 60vw, 100vw" className="mt-8 w-full rounded-[var(--radius-card)] object-cover" />
          ) : null}
          <Prose html={renderMarkdown(service.body_md)} className="mt-8" />
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="mt-10">
              <h2 id={s.id} className="text-2xl">
                {s.title}
              </h2>
              <Prose html={renderMarkdown(s.md)} className="mt-3" />
            </section>
          ))}
          {service.faqs.length ? (
            <section aria-labelledby="faq-servicio" className="mt-12">
              <h2 id="faq-servicio" className="mb-4 text-2xl">
                Preguntas frecuentes
              </h2>
              <ServiceFaqs faqs={service.faqs} />
            </section>
          ) : null}
          {doctors.length ? (
            <section aria-labelledby="profesionales" className="mt-12">
              <h2 id="profesionales" className="mb-6 text-2xl">
                Profesionales que realizan este servicio
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {doctors.map((d) => (
                  <li key={d.id}>
                    <DoctorChip doctor={d} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
        <aside aria-label="Reserva" className="lg:sticky lg:top-28 lg:self-start">
          <Card className="space-y-4">
            {duration ? (
              <p>
                <span className="block text-sm text-muted">Duración aproximada</span>
                <span className="font-semibold">{duration}</span>
              </p>
            ) : null}
            {typeof service.price_pen === "number" ? (
              <p>
                <span className="block text-sm text-muted">Precio</span>
                <span className="font-semibold">{fmtPen.format(service.price_pen)}</span>
              </p>
            ) : null}
            <a
              href={bookable ? `/reservar?servicio=${encodeURIComponent(service.slug)}` : "/reservar"}
              className={buttonVariants({ className: "w-full" })}
            >
              <CalendarCheck aria-hidden="true" />
              {bookable ? "Reservar este servicio" : "Solicitar cita"}
            </a>
            {!bookable ? <p className="text-sm text-muted">Recepción coordinará contigo la fecha y la hora.</p> : null}
          </Card>
        </aside>
      </div>
    </Container>
  );
}
