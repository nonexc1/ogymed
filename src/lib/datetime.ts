/** Toda fecha/hora visible se presenta en la zona de Lima; los instantes viajan como ISO UTC. */
export const CLINIC_TZ = "America/Lima";
export const CLINIC_LOCALE = "es-PE";

const dateFmt = new Intl.DateTimeFormat(CLINIC_LOCALE, {
  timeZone: CLINIC_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFmt = new Intl.DateTimeFormat(CLINIC_LOCALE, {
  timeZone: CLINIC_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat(CLINIC_LOCALE, {
  timeZone: CLINIC_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ });

export const formatLimaDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatLimaShortDate = (iso: string | Date) => shortDateFmt.format(new Date(iso));
export const formatLimaTime = (iso: string | Date) => timeFmt.format(new Date(iso));
export const formatLimaDateTime = (iso: string | Date) => `${formatLimaDate(iso)}, ${formatLimaTime(iso)}`;

/** Clave YYYY-MM-DD del día en Lima. */
export const limaDateKey = (iso: string | Date = new Date()) => keyFmt.format(new Date(iso));

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Nombre del día para una clave (sin desfase por zona horaria). */
export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(CLINIC_LOCALE, { ...opts, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const isoWeekdayName = (isoDay: number) => WEEKDAYS[isoDay - 1] ?? "";
