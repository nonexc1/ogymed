import "server-only";

import type { NextRequest } from "next/server";

import { siteUrl } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { hmacHex } from "@/lib/security/crypto";

/**
 * Protección CSRF para route handlers que mutan estado: el navegador debe declarar un Origin igual al
 * del sitio (o al host de la petición en desarrollo/previews).
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Con Referrer-Policy: no-referrer, los formularios envían «Origin: null». En ese caso se exige
  // Sec-Fetch-Site: same-origin, cabecera que el navegador fija y ningún script puede falsificar.
  if (!origin || origin === "null") return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const o = new URL(origin);
    const allowed = new Set([new URL(siteUrl).host, request.nextUrl.host]);
    return allowed.has(o.host);
  } catch {
    return false;
  }
}

/** IP del cliente hasheada (nunca se guarda en claro). En Vercel, x-forwarded-for lo fija la plataforma. */
export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return hmacHex(serverEnv.BOOKING_CODE_PEPPER ?? "dev-only-pepper", `ip:${ip}`);
}
