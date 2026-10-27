/** Mensaje prellenado genérico: sin síntomas, servicio, nombre ni enlaces privados. */
export const WHATSAPP_MESSAGE = "Hola, quisiera coordinar una cita en OGYMED";

export const whatsappUrl = (e164: string) =>
  `https://wa.me/${e164.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const telUrl = (e164: string) => `tel:${e164.replace(/[^+0-9]/g, "")}`;

/** +51987654321 → +51 987 654 321 */
export function formatPhone(e164: string): string {
  const m = /^\+51(\d{3})(\d{3})(\d{3})$/.exec(e164);
  if (m) return `+51 ${m[1]} ${m[2]} ${m[3]}`;
  const lima = /^\+51(1)(\d{3})(\d{4})$/.exec(e164);
  if (lima) return `+51 ${lima[1]} ${lima[2]} ${lima[3]}`;
  return e164;
}
