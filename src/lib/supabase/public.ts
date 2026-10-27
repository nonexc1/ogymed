import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Cliente anónimo (publishable key) para leer contenido publicado y configuración pública.
 * Sin cookies ni sesión: apto para páginas estáticas/ISR. Devuelve null si Supabase no está configurado.
 */
export function getPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
