import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import type { HomeData } from "@/features/cms/home";
import { contactChannels } from "@/features/cms/request-state";
import type { Faq, PublicSettings } from "@/features/cms/types";
import { cn } from "@/lib/utils";

import { FaqList } from "../blocks";
import { addressText, OpeningHours } from "../opening-hours";
import { Photo, type PhotoSource } from "../photo";
import { SiteLink } from "../site-link";
import { VoluntaryMap } from "../voluntary-map";
import { Eyebrow, HOME_WIDTH } from "./hero";

/** La clínica: fotografía amplia con texto superpuesto o, sin foto, una banda ciruela con la declaración de identidad. */
export function HomeClinic({ clinic }: { clinic: HomeData["clinic"] }) {
  if (!clinic) return null;
  const link = (
    <SiteLink href="/la-clinica" className="mt-8 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
      Conoce la clínica <ArrowRight aria-hidden="true" className="size-4" />
    </SiteLink>
  );
  if (!clinic.photo) {
    return (
      <section id="clinica" aria-labelledby="clinica-title" className="scroll-mt-24 bg-plum text-ivory">
        <div className={cn(HOME_WIDTH, "grid gap-8 py-20 lg:grid-cols-12 lg:py-24")}>
          <div className="lg:col-span-4">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-rose">La clínica</p>
            <h2 id="clinica-title" className="mt-4 text-[2.2rem] leading-[1.08] text-ivory sm:text-5xl">
              {clinic.title}
            </h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="font-display text-[1.6rem] leading-snug text-ivory sm:text-[2rem]">{clinic.intro}</p>
            <div className="text-rose">{link}</div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section id="clinica" aria-labelledby="clinica-title" className={cn(HOME_WIDTH, "scroll-mt-24 py-20 lg:py-28")}>
      <div className="relative">
        <div className="max-w-xl lg:absolute lg:bottom-10 lg:left-10 lg:z-10 lg:rounded-[1.5rem] lg:bg-ivory lg:p-10 lg:shadow-lg">
          <Eyebrow>La clínica</Eyebrow>
          <h2 id="clinica-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-[2.6rem]">
            {clinic.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{clinic.intro}</p>
          <div className="text-plum">{link}</div>
        </div>
        <Photo
          source={clinic.photo}
          sizes="(min-width: 1216px) 1150px, 100vw"
          className="mt-10 aspect-[4/3] rounded-[1.75rem] sm:aspect-[16/9] lg:mt-0 lg:aspect-[21/9]"
          pendingClassName="lg:items-end lg:pr-16 lg:text-right"
        />
      </div>
    </section>
  );
}

type Step = { title: string; text: string };

/** Pasos según el estado REAL de las citas: nunca se promete confirmación automática si no existe. */
export function requestSteps(data: Pick<HomeData, "requestKind" | "bookingLabel" | "settings">): Step[] | null {
  const { requestKind, bookingLabel, settings } = data;
  if (requestKind === "agenda") {
    const automatic = bookingLabel === "Reservar cita";
    return [
      { title: "Elige servicio y horario", text: "Ves la disponibilidad real de la agenda, en hora de Lima." },
      { title: "Verifica tu correo", text: "Te enviamos un código de seis dígitos. No necesitas crear una cuenta." },
      automatic
        ? { title: "Cita confirmada", text: "Recibes la confirmación por correo y un enlace seguro para cambiarla o cancelarla." }
        : { title: "Recepción la confirma", text: "Tu solicitud queda pendiente hasta que recepción la confirme por correo." },
    ];
  }
  if (requestKind === "form") {
    return [
      { title: "Envía tu solicitud", text: "Indica tu nombre, cómo contactarte y el motivo general, sin datos médicos." },
      { title: "Recepción te contacta", text: "Coordinamos contigo la fecha y la hora disponibles." },
      { title: "Confirmación", text: "Tu cita queda registrada cuando recepción la confirma." },
    ];
  }
  const channels = contactChannels(settings);
  if (!channels.length) return null;
  return [
    { title: "Comunícate con recepción", text: `Por ${channels.map((c) => (c.kind === "email" ? "correo" : c.kind === "phone" ? "teléfono" : "WhatsApp")).join(" o ")}.` },
    { title: "Coordinamos tu cita", text: "Acordamos contigo la fecha y la hora disponibles." },
    { title: "Confirmación", text: "Tu cita queda registrada cuando recepción la confirma." },
  ];
}

/** Tu cita, paso a paso: filas numeradas + fotografía; incluye lo que pedimos (y lo que no) para agendar. */
export function HomeVisit({ data }: { data: HomeData }) {
  const steps = requestSteps(data);
  if (!steps) return null;
  const { photo, firstVisitPublished } = data.visit;
  return (
    <section id="visita" aria-labelledby="visita-title" className="scroll-mt-24 border-y border-line bg-sand">
      <div className={cn(HOME_WIDTH, "grid gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28", !photo && "lg:py-24")}>
        <div className={cn(photo ? "lg:col-span-6" : "lg:col-span-12")}>
          <Eyebrow>Primera visita</Eyebrow>
          <h2 id="visita-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-5xl">
            Tu cita, paso a paso
          </h2>
          <ol className={cn("mt-10", photo ? "space-y-0 border-t border-plum/15" : "grid gap-8 border-t border-plum/15 pt-8 md:grid-cols-3")}>
            {steps.map((s, i) => (
              <li key={s.title} className={cn("flex gap-5", photo && "border-b border-plum/15 py-6")}>
                <span aria-hidden="true" className="font-display text-[2.4rem] leading-none text-plum/35">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl text-muted">
            No necesitas crear una cuenta. Para agendar solo pedimos tu nombre y un medio de contacto: no compartas síntomas ni
            datos médicos por la web; eso se conversa en la consulta.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {data.requestKind !== "none" ? (
              <TrackedLink event="click_book" position="section" href="/reservar" className={buttonVariants({ size: "lg" })}>
                {data.bookingLabel} <ArrowRight aria-hidden="true" />
              </TrackedLink>
            ) : null}
            {firstVisitPublished ? (
              <SiteLink href="/primera-visita" className="inline-flex items-center gap-2 font-semibold text-plum underline underline-offset-4">
                Prepara tu primera visita <ArrowRight aria-hidden="true" className="size-4" />
              </SiteLink>
            ) : null}
          </div>
        </div>
        {photo ? <Photo source={photo} sizes="(min-width: 1024px) 520px, 100vw" className="aspect-[4/3] rounded-[1.75rem] lg:col-span-6 lg:aspect-[4/5]" /> : null}
      </div>
    </section>
  );
}

/** Preguntas: dos columnas (encabezado + acordeón con líneas, sin tarjeta). */
export function HomeFaq({ faqs }: { faqs: Faq[] }) {
  const featured = faqs.filter((f) => f.category === "reservas" || f.category === "general").slice(0, 5);
  if (!featured.length) return null;
  return (
    <section id="preguntas" aria-labelledby="faq-title" className={cn(HOME_WIDTH, "scroll-mt-24 grid gap-10 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28")}>
      <div className="lg:col-span-4">
        <Eyebrow>Preguntas frecuentes</Eyebrow>
        <h2 id="faq-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-5xl">
          Antes de tu visita
        </h2>
        <SiteLink href="/preguntas-frecuentes" className="mt-6 inline-flex items-center gap-2 font-semibold text-plum underline underline-offset-4">
          Ver todas las preguntas <ArrowRight aria-hidden="true" className="size-4" />
        </SiteLink>
      </div>
      <div className="lg:col-span-8">
        <FaqList faqs={featured} variant="lines" />
      </div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-plum/15 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <dt className="text-sm font-semibold uppercase tracking-[0.14em] text-sage-strong">{label}</dt>
      <dd className="text-lg text-ink">{children}</dd>
    </div>
  );
}

const CHANNEL_ICONS = { whatsapp: MessageCircle, phone: Phone, email: Mail } as const;

/** Ubicación con datos reales: dirección, horario y canales configurados; mapa sólo a petición. */
export function HomeLocation({
  settings,
  photo,
  title,
  intro,
  className,
}: {
  settings: PublicSettings;
  photo: PhotoSource | null;
  title?: string;
  intro?: React.ReactNode;
  className?: string;
}) {
  const address = addressText(settings);
  const channels = contactChannels(settings);
  const hasMap = settings.latitude !== null && settings.longitude !== null;
  const aside = hasMap ? (
    <VoluntaryMap latitude={settings.latitude!} longitude={settings.longitude!} label={address ?? settings.district} />
  ) : photo ? (
    <Photo source={photo} sizes="(min-width: 1024px) 520px, 100vw" className="aspect-[4/3] rounded-[1.75rem]" />
  ) : null;
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className={cn(HOME_WIDTH, "scroll-mt-24 py-20 lg:py-28", className)}>
      <div className={cn("grid gap-12", aside && "lg:grid-cols-2 lg:items-center lg:gap-16")}>
        <div>
          <Eyebrow>Ubicación</Eyebrow>
          <h2 id="ubicacion-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-5xl">
            {title ?? `Te esperamos en ${settings.district}`}
          </h2>
          {intro ? <div className="mt-5 max-w-xl text-lg text-muted">{intro}</div> : null}
          <dl className="mt-8 border-t border-plum/15">
            <DetailRow label="Dirección">
              <span className="flex items-start gap-2">
                <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-plum" />
                <span>
                  {address ?? `${settings.district}, ${settings.city}`}
                  {settings.address_reference ? <span className="block text-base text-muted">{settings.address_reference}</span> : null}
                </span>
              </span>
            </DetailRow>
            {settings.opening_hours.length ? (
              <DetailRow label="Horario">
                <OpeningHours settings={settings} />
              </DetailRow>
            ) : null}
            {channels.length ? (
              <DetailRow label="Contacto">
                <ul className="space-y-2">
                  {channels.map((c) => {
                    const Icon = CHANNEL_ICONS[c.kind];
                    if (c.kind === "email") {
                      return (
                        <li key={c.kind}>
                          <a href={c.href} className="inline-flex items-center gap-2 text-plum underline-offset-4 hover:underline">
                            <Icon aria-hidden="true" className="size-5" /> {c.label}
                          </a>
                        </li>
                      );
                    }
                    return (
                      <li key={c.kind}>
                        <TrackedLink
                          event={c.kind === "whatsapp" ? "click_whatsapp" : "click_call"}
                          position="section"
                          href={c.href}
                          {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="inline-flex items-center gap-2 text-plum underline-offset-4 hover:underline"
                        >
                          <Icon aria-hidden="true" className="size-5" /> {c.label}
                          {c.external ? <span className="sr-only"> (se abre en una pestaña nueva)</span> : null}
                        </TrackedLink>
                      </li>
                    );
                  })}
                </ul>
              </DetailRow>
            ) : null}
          </dl>
          {settings.google_maps_url ? (
            <TrackedLink
              event="click_directions"
              position="section"
              href={settings.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-8")}
            >
              <MapPin aria-hidden="true" /> Cómo llegar<span className="sr-only"> (abre Google Maps en una pestaña nueva)</span>
            </TrackedLink>
          ) : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
