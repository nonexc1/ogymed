import { BadgeCheck, CalendarCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MediaImage } from "@/components/site/media-image";
import { Prose } from "@/components/site/prose";
import { SiteLink } from "@/components/site/site-link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/surface";
import { plainText, renderMarkdown } from "@/features/cms/markdown";
import { getDoctor, getOfferings, getSettings, listDoctors, servicesForDoctor } from "@/features/cms/queries";
import { breadcrumbJsonLd, doctorJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listDoctors()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/equipo/[slug]">) {
  const { slug } = await params;
  const doctor = await getDoctor(slug);
  if (!doctor) return { title: "Perfil no encontrado", robots: { index: false } };
  return pageMetadata({
    title: doctor.seo.title ?? `${doctor.display_name}${doctor.specialty ? `, ${doctor.specialty}` : ""}`,
    description: doctor.seo.description ?? plainText(doctor.bio_md),
    path: doctor.path,
    image: doctor.seo.og ?? doctor.photo,
    type: "profile",
  });
}

export default async function DoctorPage({ params }: PageProps<"/equipo/[slug]">) {
  const { slug } = await params;
  const doctor = await getDoctor(slug);
  if (!doctor) notFound();
  const [services, offerings, settings] = await Promise.all([servicesForDoctor(doctor.id), getOfferings(), getSettings()]);
  const bookable = settings.booking_mode !== "off" && offerings.some((o) => o.doctor_id === doctor.id && o.online_booking);
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Equipo", href: "/equipo" },
    { name: doctor.display_name, href: doctor.path },
  ];
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={[breadcrumbJsonLd(crumbs), doctorJsonLd(doctor)]} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-8 grid gap-12 md:grid-cols-[18rem_1fr]">
        <div>
          {doctor.photo ? (
            <MediaImage media={doctor.photo} priority sizes="(min-width: 768px) 288px, 100vw" className="aspect-[4/5] w-full rounded-[var(--radius-card)] object-cover" />
          ) : null}
        </div>
        <article>
          <h1 className="text-4xl sm:text-5xl">{doctor.display_name}</h1>
          {doctor.specialty ? <p className="mt-2 text-xl text-muted">{doctor.specialty}</p> : null}
          {doctor.cmp_number ? (
            <p className="mt-3 flex items-center gap-2 text-sage-strong">
              <BadgeCheck aria-hidden="true" className="size-5" />
              CMP {doctor.cmp_number}
              {doctor.rne_number ? ` · RNE ${doctor.rne_number}` : ""}
              <span className="text-sm text-muted">(verificado por la clínica)</span>
            </p>
          ) : null}
          <Prose html={renderMarkdown(doctor.bio_md)} className="mt-8" />
          {doctor.background_md ? (
            <section aria-labelledby="trayectoria" className="mt-10">
              <h2 id="trayectoria" className="text-2xl">
                Trayectoria
              </h2>
              <Prose html={renderMarkdown(doctor.background_md)} className="mt-3" />
            </section>
          ) : null}
          {services.length ? (
            <section aria-labelledby="servicios-prof" className="mt-10">
              <h2 id="servicios-prof" className="text-2xl">
                Servicios
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <SiteLink href={s.path} className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-plum hover:border-plum">
                      {s.name}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <a
            href={bookable ? `/reservar?profesional=${encodeURIComponent(doctor.slug)}` : "/reservar"}
            className={buttonVariants({ size: "lg", className: "mt-10" })}
          >
            <CalendarCheck aria-hidden="true" />
            {bookable ? `Reservar con ${doctor.display_name}` : "Solicitar cita"}
          </a>
        </article>
      </div>
    </Container>
  );
}
