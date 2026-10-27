import { z } from "zod";

/** Normaliza teléfonos peruanos a E.164 (+51…). Acepta 9 dígitos móviles o números ya en E.164. */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s().-]/g, "");
  if (!raw) return null;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  if (/^9\d{8}$/.test(raw)) return `+51${raw}`;
  if (/^0?1\d{7}$/.test(raw)) return `+51${raw.replace(/^0/, "")}`;
  return null;
}

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Escribe tu nombre")
  .max(120, "Máximo 120 caracteres")
  .regex(/^[\p{L}\p{M}' .-]+$/u, "Usa sólo letras");

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Escribe un correo válido"));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const phone = normalizePhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Escribe un teléfono válido (ej. 987 654 321)" });
      return z.NEVER;
    }
    return phone;
  });
