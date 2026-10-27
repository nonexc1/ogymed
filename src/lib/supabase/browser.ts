"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente del navegador para el panel (login y MFA). Sólo usa la publishable key. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
