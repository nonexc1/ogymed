import { z } from "zod";

/** Campos opcionales de texto: cadena vacía → null. */
export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null));

export const reqText = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label}: mínimo ${min} caracteres`).max(max, `${label}: máximo ${max} caracteres`);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: sólo minúsculas, números y guiones (ej. consulta-ginecologica)")
  .max(80);

export const optUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

/** «Pregunta | Respuesta» por línea → [{ q, a }] */
export function parseFaqLines(text: string): { q: string; a: string }[] {
  return text
    .split("\n")
    .map((l) => l.split("|").map((p) => p.trim()))
    .filter(([q, a]) => q && a)
    .map(([q, a]) => ({ q: q!, a: a! }));
}

export const faqLines = (faqs: { q: string; a: string }[]) => faqs.map((f) => `${f.q} | ${f.a}`).join("\n");

export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Revisa los datos.";
