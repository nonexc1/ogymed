import "server-only";

import type { NavItem } from "@/components/site/header";

import { getPage, listDoctors, listPosts, listServices } from "./queries";
import { getRequestState } from "./request-state";

const LEGAL_PAGES = [
  { kind: "privacy", href: "/privacidad", label: "Privacidad" },
  { kind: "cookies", href: "/cookies", label: "Cookies" },
  { kind: "terms", href: "/terminos", label: "Términos" },
  { kind: "booking_policy", href: "/politica-de-citas", label: "Política de citas" },
] as const;

/** Datos compartidos por cabecera, footer y barra móvil. Sólo enlaza secciones con contenido publicado. */
export async function getSiteShell() {
  const [{ settings, label, kind }, services, doctors, posts, clinic, faq, firstVisit, ...legal] = await Promise.all([
    getRequestState(),
    listServices(),
    listDoctors(),
    listPosts(),
    getPage("clinic"),
    getPage("faq"),
    getPage("first_visit"),
    ...LEGAL_PAGES.map((l) => getPage(l.kind)),
  ]);

  const nav: NavItem[] = [];
  if (services.length) nav.push({ href: "/servicios", label: "Servicios" });
  if (doctors.length) nav.push({ href: "/equipo", label: "Equipo médico" });
  if (clinic) nav.push({ href: "/la-clinica", label: "La clínica" });
  if (firstVisit) nav.push({ href: "/primera-visita", label: "Primera visita" });
  if (posts.length) nav.push({ href: "/blog", label: "Blog" });
  nav.push({ href: "/contacto", label: "Contacto" });

  const legalLinks: { href: string; label: string }[] = LEGAL_PAGES.filter((_, i) => legal[i]).map(({ href, label }) => ({ href, label }));
  if (faq) legalLinks.unshift({ href: "/preguntas-frecuentes", label: "Preguntas frecuentes" });
  if (settings.complaints_book_enabled) legalLinks.push({ href: "/libro-de-reclamaciones", label: "Libro de reclamaciones" });

  const missing: string[] = [];
  if (!settings.address_line) missing.push("dirección");
  if (!settings.phone_e164) missing.push("teléfono");
  if (!settings.whatsapp_e164) missing.push("WhatsApp");
  if (!settings.opening_hours.length) missing.push("horarios");
  if (!settings.legal_name || !settings.ruc) missing.push("razón social/RUC");
  if (!legal[0]) missing.push("política de privacidad publicada");

  return {
    settings,
    nav,
    legalLinks,
    missing,
    bookingLabel: label,
    requestKind: kind,
  };
}
