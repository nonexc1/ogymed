import { z } from "zod";

/**
 * Variables de entorno validadas. Las públicas (NEXT_PUBLIC_*) se exponen al navegador; el resto
 * sólo existe en el servidor (ver src/lib/env.server.ts). Nunca registrar sus valores.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
});

const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  // Fallback: nombre que crea la integración Supabase de Vercel (clave anon heredada, mismo rol).
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
});

if (!parsed.success) {
  throw new Error(`Variables públicas inválidas: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
}

export const publicEnv = parsed.data;

export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Entorno de despliegue: production sólo en el despliegue de producción de Vercel o si se declara. */
export const deployEnv: "development" | "preview" | "production" =
  process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production"
    ? "production"
    : process.env.VERCEL_ENV === "preview" || process.env.APP_ENV === "preview"
      ? "preview"
      : "development";

/** En producción nunca se muestran datos demo aunque existieran en la base. */
export const hideDemoContent = deployEnv === "production";
