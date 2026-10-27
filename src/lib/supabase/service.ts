import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

let client: SupabaseClient | null = null;

/**
 * Cliente con clave secreta (rol service_role). Sólo para route handlers de reserva, autogestión,
 * formularios públicos y cron. Ese rol NO tiene privilegios sobre tablas: sólo puede ejecutar las
 * funciones SQL que validan sesión, propiedad y estado. Nunca importar desde componentes cliente.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SECRET_KEY) return null;
  client ??= createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Cliente de administración de Auth (invitaciones). Requiere haber verificado antes rol admin + MFA. */
export function getAuthAdminClient() {
  const c = getServiceClient();
  if (!c) throw new Error("Supabase no está configurado en el servidor");
  return c.auth.admin;
}
