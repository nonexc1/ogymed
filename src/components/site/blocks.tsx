import { ArrowRight, BadgeCheck, CalendarCheck, MessageCircle, Phone, UserRound } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { renderMarkdown } from "@/features/cms/markdown";
import type { Doctor, Faq, PublicSettings, Service } from "@/features/cms/types";
import type { AnalyticsPosition } from "@/lib/analytics/policy";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/contact-links";
import { cn } from "@/lib/utils";

import { MediaImage } from "./media-image";
import { addressText, OpeningHours } from "./opening-hours";
import { Prose } from "./prose";
import { SiteLink } from "./site-link";

export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-2 md:grid-cols-2">
      {services.map((s) => (
        <li key={s.id} className="border-b border-line">
          <SiteLink href={s.path} className="group flex items-start justify-between gap-4 py-5">
            <span>
              <span className="block font-display text-xl text-plum-strong group-hover:text-plum">{s.name}</span>
              {s.summary ? <span className="mt-1 block text-muted">{s.summary}</span> : null}
            </span>
            <ArrowRight aria-hidden="true" className="mt-1.5 size-5 shrink-0 text-sage transition-transform group-hover:translate-x-1" />
          </SiteLink>
        </li>
      ))}
    </ul>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter((p) => p && !p.endsWith("."))
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-rose/60" aria-hidden="true">
      <span className="font-display text-5xl text-plum">{initials || <UserRound className="size-12" />}</span>
    </div>
  );
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <SiteLink href={doctor.path} className="group block">
      {doctor.photo ? (
        <MediaImage media={doctor.photo} sizes="(min-width: 1024px) 280px, 45vw" className="aspect-[4/5] w-full rounded-2xl object-cover" />
      ) : (
        <Initials name={doctor.full_name} />
      )}
      <p className="mt-3 font-display text-xl text-plum-strong group-hover:text-plum">{doctor.display_name}</p>
      {doctor.specialty ? <p className="text-muted">{doctor.specialty}</p> : null}
      {doctor.cmp_number ? (
        <p className="mt-1 flex items-center gap-1 text-sm text-sage-strong">
          <BadgeCheck aria-hidden="true" className="size-4" /> CMP {doctor.cmp_number}
          {doctor.rne_number ? ` · RNE ${doctor.rne_number}` : ""}
        </p>
      ) : null}
    </SiteLink>
  );
}

/** Versión compacta para listas dentro de una ficha (servicio, artículo). */
export function DoctorChip({ doctor }: { doctor: Doctor }) {
  return (
    <SiteLink href={doctor.path} className="group flex items-center gap-4 rounded-2xl border border-line bg-paper p-3 pr-5 hover:border-plum/40">
      {doctor.photo ? (
        <MediaImage media={doctor.photo} sizes="64px" className="size-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-rose/60 font-display text-xl text-plum">
          {doctor.full_name.split(" ").filter((p) => p && !p.endsWith(".")).slice(0, 2).map((p) => p[0]).join("")}
        </span>
      )}
      <span>
        <span className="block font-display text-lg text-plum-strong group-hover:text-plum">{doctor.display_name}</span>
        {doctor.specialty ? <span className="block text-sm text-muted">{doctor.specialty}</span> : null}
      </span>
    </SiteLink>
  );
}

export function FaqList({
  faqs,
  variant = "card",
}: {
  faqs: { id: string; question: string; answer_md: string }[];
  variant?: "card" | "lines";
}) {
  const lines = variant === "lines";
  return (
    <div className={lines ? "divide-y divide-line border-y border-line" : "divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper"}>
      {faqs.map((f) => (
        <details key={f.id} className={`group [&_summary::-webkit-details-marker]:hidden ${lines ? "py-6" : "p-5"}`}>
          <summary
            className={`flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg text-ink ${lines ? "font-display text-[1.3rem] leading-snug text-plum-strong" : "font-semibold"}`}
          >
            <span>{f.question}</span>
            <span aria-hidden="true" className="text-plum transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <Prose html={renderMarkdown(f.answer_md)} className="mt-3 text-muted" />
        </details>
      ))}
    </div>
  );
}

export function ServiceFaqs({ faqs }: { faqs: Service["faqs"] }) {
  return <FaqList faqs={faqs.map((f, i) => ({ id: String(i), question: f.q, answer_md: f.a }))} />;
}

export type FaqItem = Faq;

export function ContactActions({
  settings,
  bookingLabel,
  position,
  className,
  showBooking = true,
}: {
  settings: PublicSettings;
  bookingLabel: string;
  position: AnalyticsPosition;
  className?: string;
  showBooking?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      {showBooking ? (
        <TrackedLink event="click_book" position={position} href="/reservar" className={buttonVariants({ size: "lg" })}>
          <CalendarCheck aria-hidden="true" /> {bookingLabel}
        </TrackedLink>
      ) : null}
      {settings.whatsapp_e164 ? (
        <TrackedLink
          event="click_whatsapp"
          position={position}
          href={whatsappUrl(settings.whatsapp_e164)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          <MessageCircle aria-hidden="true" /> WhatsApp<span className="sr-only"> (se abre en una pestaña nueva)</span>
        </TrackedLink>
      ) : null}
      {settings.phone_e164 ? (
        <TrackedLink event="click_call" position={position} href={telUrl(settings.phone_e164)} className={buttonVariants({ variant: "ghost", size: "lg" })}>
          <Phone aria-hidden="true" /> {formatPhone(settings.phone_e164)}
        </TrackedLink>
      ) : null}
    </div>
  );
}

export function LocationCard({ settings, position }: { settings: PublicSettings; position: AnalyticsPosition }) {
  const address = addressText(settings);
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-sans text-lg font-semibold text-ink">Dirección</h3>
        <address className="not-italic text-muted">
          {address ?? `${settings.district}, ${settings.city}`}
          {settings.address_reference ? <span className="block text-sm">{settings.address_reference}</span> : null}
        </address>
        {settings.google_maps_url ? (
          <TrackedLink
            event="click_directions"
            position={position}
            href={settings.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-plum underline underline-offset-4"
          >
            Cómo llegar<span className="sr-only"> (abre Google Maps en una pestaña nueva)</span>
          </TrackedLink>
        ) : null}
      </div>
      {settings.opening_hours.length ? (
        <div>
          <h3 className="font-sans text-lg font-semibold text-ink">Horario de atención</h3>
          <div className="text-muted">
            <OpeningHours settings={settings} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function ReviewNote({ reviewedAt, reviewer }: { reviewedAt?: string | null; reviewer?: string | null }) {
  if (!reviewedAt) return null;
  const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(new Date(reviewedAt));
  return (
    <Badge tone="sage">
      <BadgeCheck aria-hidden="true" className="size-4" />
      Revisado por el equipo médico{reviewer ? ` (${reviewer})` : ""} el {date}
    </Badge>
  );
}
