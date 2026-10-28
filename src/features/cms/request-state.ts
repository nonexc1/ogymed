import "server-only";

import { formatPhone, telUrl, whatsappUrl } from "@/lib/contact-links";
import { bookingInfraReady } from "@/lib/env.server";

import { getOfferings, getPrivacyVersion, getSettings, listServices } from "./queries";
import type { PublicSettings } from "./types";

/**
 * Estado REAL de la vía para pedir cita (una sola fuente para cabecera, portada y /reservar):
 * - agenda: reserva en línea con disponibilidad real (modo automático o con confirmación de recepción);
 * - form: formulario de solicitud (recepción coordina; requiere política de privacidad publicada);
 * - none: todavía no hay vía en línea (sólo se ofrecen los canales configurados, si existen).
 * «Reservar» sólo aparece cuando la confirmación es automática y la agenda está lista.
 */
export async function getRequestState() {
  const [settings, services, offerings, privacyVersion] = await Promise.all([
    getSettings(),
    listServices(),
    getOfferings(),
    getPrivacyVersion(),
  ]);
  const online = offerings.filter((o) => o.online_booking);
  const bookableServices = services.filter((s) => online.some((o) => o.service_id === s.id));
  const agendaReady =
    settings.booking_mode !== "off" && bookingInfraReady && Boolean(privacyVersion) && bookableServices.length > 0;
  const kind: "agenda" | "form" | "none" = agendaReady ? "agenda" : privacyVersion ? "form" : "none";
  const label = agendaReady && settings.booking_mode === "automatic" ? "Reservar cita" : "Solicitar cita";
  return { settings, kind, label, agendaReady, privacyVersion, online, bookableServices };
}

export type ContactChannel = {
  kind: "whatsapp" | "phone" | "email";
  label: string;
  href: string;
  external: boolean;
};

/** Sólo los canales configurados en el panel: nunca se recomienda un canal sin enlace real. */
export function contactChannels(settings: PublicSettings): ContactChannel[] {
  const out: ContactChannel[] = [];
  if (settings.whatsapp_e164) out.push({ kind: "whatsapp", label: "WhatsApp", href: whatsappUrl(settings.whatsapp_e164), external: true });
  if (settings.phone_e164) out.push({ kind: "phone", label: formatPhone(settings.phone_e164), href: telUrl(settings.phone_e164), external: false });
  if (settings.public_email) out.push({ kind: "email", label: settings.public_email, href: `mailto:${settings.public_email}`, external: false });
  return out;
}
