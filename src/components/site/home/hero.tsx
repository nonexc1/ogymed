import { ArrowRight, CalendarCheck, Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/contact-links";
import { cn } from "@/lib/utils";

import { Photo, type PhotoSource } from "../photo";
import { SiteLink } from "../site-link";

export const HOME_WIDTH = "mx-auto w-full max-w-[76rem] px-5 sm:px-8";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sage-strong", className)}>{children}</p>;
}

/**
 * Hero en dos columnas: texto y acciones primero (también en móvil) y fotografía editorial después.
 * Sin fotografía real publicada, el hero ocupa una columna con fondo decorativo: nunca un marcador.
 */
export function HomeHero({
  kicker,
  title,
  text,
  bookingLabel,
  whatsapp,
  photo,
}: {
  kicker: string;
  title: string;
  text: string;
  bookingLabel: string;
  whatsapp: string | null;
  photo: PhotoSource | null;
}) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-sand">
      {photo ? null : (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-32 size-[36rem] rounded-full bg-rose/60 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 right-1/4 size-[26rem] rounded-full bg-sage-soft blur-3xl" />
        </>
      )}
      <div
        className={cn(
          HOME_WIDTH,
          "relative grid items-center gap-10 pb-12 pt-10 sm:pb-16 sm:pt-14 lg:gap-14 lg:pb-20 lg:pt-16",
          photo && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        )}
      >
        <div className={cn(!photo && "max-w-3xl py-4 lg:py-12")}>
          <Eyebrow>{kicker}</Eyebrow>
          <h1 id="hero-title" className="mt-5 text-[2.6rem] leading-[1.04] tracking-[-0.02em] sm:text-[3.6rem] lg:text-[4.15rem]">
            {title}
          </h1>
          <p className="mt-6 max-w-[30rem] text-xl leading-relaxed text-muted sm:text-[1.4rem] sm:leading-snug">{text}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <TrackedLink event="click_book" position="hero" href="/reservar" className={buttonVariants({ size: "lg" })}>
              {bookingLabel}
              <ArrowRight aria-hidden="true" />
            </TrackedLink>
            {whatsapp ? (
              <TrackedLink
                event="click_whatsapp"
                position="hero"
                href={whatsappUrl(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                <MessageCircle aria-hidden="true" /> WhatsApp<span className="sr-only"> (se abre en una pestaña nueva)</span>
              </TrackedLink>
            ) : null}
          </div>
        </div>
        {photo ? (
          <Photo
            source={photo}
            priority
            sizes="(min-width: 1216px) 620px, (min-width: 1024px) 52vw, 100vw"
            className="aspect-square rounded-[1.5rem] sm:aspect-[4/3] lg:aspect-[9/7.3]"
          />
        ) : null}
      </div>
    </section>
  );
}

export type Fact = {
  icon: "location" | "request" | "hours" | "whatsapp" | "phone";
  text: string;
  href?: string;
  external?: boolean;
  event?: "click_book" | "click_whatsapp" | "click_call" | "click_directions";
};

const FACT_ICONS = { location: MapPin, request: CalendarCheck, hours: Clock, whatsapp: MessageCircle, phone: Phone } as const;

/** Banda de datos REALES bajo el hero (ubicación, vía de cita, horario, canales). Con menos de dos, no se muestra. */
export function HomeFacts({ facts }: { facts: Fact[] }) {
  if (facts.length < 2) return null;
  return (
    <div className="border-b border-line/70 bg-plum-soft">
      <ul
        className={cn(
          HOME_WIDTH,
          "flex flex-col gap-3 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-y-3 sm:py-4",
          "sm:[&>li+li]:border-l sm:[&>li+li]:border-plum/15",
        )}
      >
        {facts.map((f) => {
          const Icon = FACT_ICONS[f.icon];
          const body = (
            <>
              <Icon aria-hidden="true" className="size-5 shrink-0 text-plum" />
              <span>{f.text}</span>
              {f.external ? <span className="sr-only"> (se abre en una pestaña nueva)</span> : null}
            </>
          );
          const cls = "flex items-center gap-3 text-[0.97rem] text-ink sm:px-8";
          return (
            <li key={f.icon} className="sm:first:pl-0 sm:last:pr-0">
              {f.href && f.event ? (
                <TrackedLink
                  event={f.event}
                  position="hero"
                  href={f.href}
                  {...(f.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={cn(cls, "underline-offset-4 hover:text-plum hover:underline")}
                >
                  {body}
                </TrackedLink>
              ) : f.href ? (
                <SiteLink href={f.href} className={cn(cls, "underline-offset-4 hover:text-plum hover:underline")}>
                  {body}
                </SiteLink>
              ) : (
                <span className={cls}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
