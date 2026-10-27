import "server-only";

import { z } from "zod";

import { deployEnv } from "@/lib/env";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  BOOKING_CODE_PEPPER: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().min(5).optional(),
  EMAIL_REPLY_TO: z.email().optional(),
  EMAIL_TRANSPORT: z.enum(["resend", "dev-file", "disabled"]).optional(),
  SITE_INDEXING: z.enum(["on", "off"]).default("off"),
});

// Fallbacks: nombres que crea la integración Supabase de Vercel (clave heredada, mismo rol service_role).
const ALIASES: Partial<Record<keyof typeof serverSchema.shape, string>> = { SUPABASE_SECRET_KEY: "SUPABASE_SERVICE_ROLE_KEY" };

const parsed = serverSchema.safeParse(
  Object.fromEntries(
    Object.keys(serverSchema.shape).map((k) => {
      const alias = ALIASES[k as keyof typeof serverSchema.shape];
      return [k, process.env[k] || (alias ? process.env[alias] : undefined) || undefined];
    }),
  ),
);

if (!parsed.success) {
  // Sólo nombres de variables, nunca valores.
  throw new Error(`Variables de servidor inválidas: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
}

const env = parsed.data;

export const serverEnv = env;

/** Transporte de correo efectivo. En producción sin Resend: deshabilitado (nunca se finge un envío). */
export const emailTransport: "resend" | "dev-file" | "disabled" =
  env.EMAIL_TRANSPORT ??
  (env.RESEND_API_KEY && env.EMAIL_FROM ? "resend" : deployEnv === "production" ? "disabled" : "dev-file");

if (emailTransport === "dev-file" && deployEnv === "production") {
  throw new Error("EMAIL_TRANSPORT=dev-file no está permitido en producción");
}

/** La indexación sólo se habilita explícitamente y en producción. */
export const indexingEnabled = env.SITE_INDEXING === "on" && deployEnv === "production";

export function requireServerSecret(name: "SUPABASE_SECRET_KEY" | "BOOKING_CODE_PEPPER" | "CRON_SECRET"): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Falta la variable de servidor ${name}`);
  }
  return value;
}

/** Las reservas web requieren estas piezas además de la configuración en base de datos. */
export const bookingInfraReady = Boolean(env.SUPABASE_SECRET_KEY && env.BOOKING_CODE_PEPPER && emailTransport !== "disabled");
