import type { NextRequest } from "next/server";

import { holdSchema } from "@/features/booking/schema";
import { bookingContext, type RpcResult } from "@/features/booking/server";
import { BOOKING_COOKIE, setSessionCookie } from "@/features/booking/session";
import { guardedJson, fail, json, logRpcError } from "@/lib/api";
import { randomToken, sha256Hex } from "@/lib/security/crypto";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** Retiene un horario (por defecto 5 min). Crea la sesión de reserva si no existe. */
export async function POST(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, holdSchema, RATE_LIMITS.hold);
  if (!g.ok) return g.response;

  let sessionHash = ctx.sessionHash;
  let newToken: string | null = null;
  let cookieMaxAge = 6 * 3600;
  const tryHold = async () =>
    ctx.db.rpc("booking_create_hold", {
      p_session_hash: sessionHash,
      p_service_id: g.data.serviceId,
      p_doctor_id: g.data.doctorId,
      p_starts_at: g.data.startsAt,
    });

  let result = sessionHash ? await tryHold() : null;
  if (!result || (result.data as RpcResult | null)?.code === "session_invalid") {
    newToken = randomToken();
    sessionHash = sha256Hex(newToken);
    const created = await ctx.db.rpc("booking_session_create", { p_token_hash: sessionHash });
    if (created.error) {
      logRpcError("booking_session_create", created.error);
      return fail("unavailable", 503);
    }
    const expiresAt = Date.parse((created.data as { expires_at?: string })?.expires_at ?? "");
    if (Number.isFinite(expiresAt)) cookieMaxAge = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));
    result = await tryHold();
  }
  if (result.error) {
    logRpcError("booking_create_hold", result.error);
    return fail("unavailable", 503);
  }
  const body = result.data as RpcResult;
  const response = json({ ...body, serverNow: new Date().toISOString() }, body.ok ? 200 : 409);
  if (newToken) setSessionCookie(response, BOOKING_COOKIE, newToken, cookieMaxAge);
  return response;
}
