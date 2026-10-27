import { NextResponse, type NextRequest } from "next/server";

import { MANAGE_COOKIE, setSessionCookie } from "@/features/booking/session";
import { siteUrl } from "@/lib/env";
import { clientKey, isSameOrigin } from "@/lib/security/request";
import { hitRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { randomToken, sha256Hex } from "@/lib/security/crypto";
import { getServiceClient } from "@/lib/supabase/service";

const back = (reason: string) =>
  NextResponse.redirect(new URL(`/cita/gestionar?estado=${reason}`, siteUrl), { status: 303, headers: { "Referrer-Policy": "no-referrer" } });

/**
 * Canje del enlace por POST (formulario con botón): un escáner que sólo visite el enlace con GET
 * no consume el token ni modifica nada. Tras el canje se redirige sin token en la URL.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return back("enlace-invalido");
  if (!(await hitRateLimit(RATE_LIMITS.manage, clientKey(request)))) return back("demasiados-intentos");
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return back("enlace-invalido");
  const db = getServiceClient();
  if (!db) return back("no-disponible");
  const sessionToken = randomToken();
  const { data, error } = await db.rpc("manage_redeem", { p_token_hash: sha256Hex(token), p_session_hash: sha256Hex(sessionToken) });
  if (error || !(data as { ok: boolean })?.ok) return back("enlace-invalido");
  const response = NextResponse.redirect(new URL("/cita/gestionar", siteUrl), { status: 303, headers: { "Referrer-Policy": "no-referrer" } });
  setSessionCookie(response, MANAGE_COOKIE, sessionToken, 30 * 60);
  return response;
}
