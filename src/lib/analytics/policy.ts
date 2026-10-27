/**
 * Política de analítica (compartida servidor/cliente). Ver docs/ARCHITECTURE.md §8.
 * GA4 sólo puede ejecutarse en estas rutas exactas, tras consentimiento explícito.
 * Nunca en: detalle de servicios, artículos, perfiles, reservas, autogestión, reclamaciones, admin.
 */
export const ANALYTICS_ALLOWED_PATHS = [
  "/",
  "/la-clinica",
  "/servicios",
  "/equipo",
  "/primera-visita",
  "/preguntas-frecuentes",
  "/contacto",
  "/blog",
] as const;

export const ANALYTICS_EVENTS = ["click_book", "click_whatsapp", "click_call", "click_directions"] as const;
export const ANALYTICS_POSITIONS = ["header", "hero", "mobile_bar", "footer", "section", "contact"] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsPosition = (typeof ANALYTICS_POSITIONS)[number];

/** Título genérico: los títulos reales pueden revelar procedimientos o condiciones. */
export const ANALYTICS_PAGE_TITLE = "OGYMED";

export const CONSENT_COOKIE = "ogymed_consent";
/** Cambiar la versión vuelve a pedir consentimiento (p. ej. si cambian categorías o proveedores). */
export const CONSENT_VERSION = "2026-10-v1";
export const CONSENT_MAX_AGE_DAYS = 180;

export function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

export function isAnalyticsAllowedPath(pathname: string): boolean {
  return (ANALYTICS_ALLOWED_PATHS as readonly string[]).includes(normalizePath(pathname));
}

/** page_location saneado: origen + ruta permitida, sin query ni fragmento. null → no enviar. */
export function sanitizePageLocation(origin: string, pathname: string): string | null {
  const path = normalizePath(pathname);
  if (!isAnalyticsAllowedPath(path)) return null;
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return null;
  }
}

/** Parámetros permitidos de un evento: sólo una posición genérica de una lista cerrada. */
export function sanitizeEventParams(event: string, position: string): { position: AnalyticsPosition } | null {
  if (!(ANALYTICS_EVENTS as readonly string[]).includes(event)) return null;
  if (!(ANALYTICS_POSITIONS as readonly string[]).includes(position)) return null;
  return { position: position as AnalyticsPosition };
}

export type ConsentState = { v: string; analytics: boolean; ts: number };

export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (value.v !== CONSENT_VERSION || typeof value.analytics !== "boolean" || typeof value.ts !== "number") return null;
    return { v: value.v, analytics: value.analytics, ts: value.ts };
  } catch {
    return null;
  }
}

export const isValidMeasurementId = (id: string | null | undefined): id is string => !!id && /^G-[A-Z0-9]{4,16}$/.test(id);
