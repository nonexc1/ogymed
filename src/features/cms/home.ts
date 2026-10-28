import "server-only";

import type { Fact } from "@/components/site/home/hero";
import { compactHours } from "@/components/site/opening-hours";
import { photoFrom, type PhotoSource } from "@/components/site/photo";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/contact-links";

import { getPage, listDoctors, listFaqs, listServices } from "./queries";
import { getRequestState } from "./request-state";
import { type Doctor, type Faq, homeSectionsSchema, type PublicSettings, type Service } from "./types";

/** Textos de portada por defecto (los define OGYMED; editables en Contenido → Portada). */
export const HOME_DEFAULTS = {
  kicker: "Ginecología en Surco, Lima",
  title: "Tu salud merece tiempo y atención.",
  text: "Conoce nuestros servicios y coordina tu próxima visita.",
};

export type RequestKind = "agenda" | "form" | "none";

export type HomeData = {
  settings: PublicSettings;
  bookingLabel: string;
  requestKind: RequestKind;
  hero: { kicker: string; title: string; text: string; photo: PhotoSource | null };
  facts: Fact[];
  services: { items: Service[]; intro?: string; photo: PhotoSource | null };
  team: { items: Doctor[]; intro?: string; pendingPhotos?: boolean };
  clinic: { title: string; intro: string; photo: PhotoSource | null } | null;
  visit: { firstVisitPublished: boolean; photo: PhotoSource | null };
  faqs: Faq[];
  location: { photo: PhotoSource | null };
};

/** Datos reales (sólo ubicación, vía de cita y canales configurados) para la banda bajo el hero. */
export function homeFacts(settings: PublicSettings, requestKind: RequestKind, bookingLabel: string): Fact[] {
  const facts: Fact[] = [
    {
      icon: "location",
      text: `${settings.district}, ${settings.city}`,
      ...(settings.google_maps_url ? { href: settings.google_maps_url, external: true, event: "click_directions" as const } : {}),
    },
  ];
  if (requestKind !== "none") {
    facts.push({
      icon: "request",
      text: bookingLabel === "Reservar cita" ? "Reserva en línea" : "Solicitud de cita en línea",
      href: "/reservar",
      event: "click_book",
    });
  }
  const hours = compactHours(settings);
  if (hours) facts.push({ icon: "hours", text: hours, href: "/contacto" });
  if (settings.whatsapp_e164) {
    facts.push({ icon: "whatsapp", text: "Atención por WhatsApp", href: whatsappUrl(settings.whatsapp_e164), external: true, event: "click_whatsapp" });
  } else if (settings.phone_e164) {
    facts.push({ icon: "phone", text: formatPhone(settings.phone_e164), href: telUrl(settings.phone_e164), event: "click_call" });
  }
  return facts.slice(0, 4);
}

/**
 * Portada con contenido APROBADO. Las fotografías salen de «Imagen principal» de cada página
 * (Portada, Servicios, La clínica, Primera visita, Contacto); si no hay, la sección usa su variante sin foto.
 */
export async function getHomeData(): Promise<HomeData> {
  const [request, home, servicesIndex, teamIndex, clinic, firstVisit, contact, services, doctors, faqs] = await Promise.all([
    getRequestState(),
    getPage("home"),
    getPage("services_index"),
    getPage("team_index"),
    getPage("clinic"),
    getPage("first_visit"),
    getPage("contact"),
    listServices(),
    listDoctors(),
    listFaqs(),
  ]);
  const sections = homeSectionsSchema.safeParse(home?.sections ?? {}).data ?? {};
  return {
    settings: request.settings,
    bookingLabel: request.label,
    requestKind: request.kind,
    hero: {
      kicker: sections.hero_kicker || HOME_DEFAULTS.kicker,
      title: sections.hero_title || HOME_DEFAULTS.title,
      text: sections.hero_text || HOME_DEFAULTS.text,
      photo: photoFrom(home?.seo.og),
    },
    facts: homeFacts(request.settings, request.kind, request.label),
    services: { items: services, intro: servicesIndex?.intro || undefined, photo: photoFrom(servicesIndex?.seo.og) },
    team: { items: doctors, intro: teamIndex?.intro || undefined },
    clinic: clinic ? { title: clinic.title, intro: clinic.intro, photo: photoFrom(clinic.seo.og) } : null,
    visit: { firstVisitPublished: Boolean(firstVisit), photo: photoFrom(firstVisit?.seo.og) },
    faqs,
    location: { photo: photoFrom(contact?.seo.og) },
  };
}
