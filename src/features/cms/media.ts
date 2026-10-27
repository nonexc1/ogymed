import { publicEnv } from "@/lib/env";

import type { Media } from "./types";

export function mediaUrl(media: NonNullable<Media>): string {
  const base = publicEnv.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/${media.bucket}/${media.path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Supabase local corre en 127.0.0.1: el optimizador de Next bloquea IPs locales (anti-SSRF). */
export const skipImageOptimization = /^(https?:\/\/)?(127\.0\.0\.1|localhost)/.test(publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? "");
