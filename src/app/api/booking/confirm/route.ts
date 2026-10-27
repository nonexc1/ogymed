import { after, type NextRequest } from "next/server";

import { confirmSchema } from "@/features/booking/schema";
import { bookingContext, type RpcResult } from "@/features/booking/server";
import { MANAGE_COOKIE, setSessionCookie } from "@/features/booking/session";
import { getPrivacyVersion } from "@/features/cms/queries";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { randomToken, sha256Hex } from "@/lib/security/crypto";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Confirma la retención (idempotente). La cita, el consentimiento y los avisos se guardan en una
 * transacción; el envío de correos ocurre después (outbox) y su fallo no revierte la cita.
 */
export async function POST(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, confirmSchema, RATE_LIMITS.confirm);
  if (!g.ok) return g.response;
  if (!ctx.sessionHash) return fail("session_invalid", 409);
  const privacyVersion = await getPrivacyVersion();
  if (!privacyVersion) return fail("privacy_unpublished", 409);

  const { data, error } = await ctx.db.rpc("booking_confirm", {
    p_session_hash: ctx.sessionHash,
    p_hold_id: g.data.holdId,
    p_idempotency_key: g.data.idempotencyKey,
    p_privacy_version: privacyVersion,
    p_marketing: g.data.marketing,
  });
  if (error) {
    logRpcError("booking_confirm", error);
    return fail("unavailable", 503);
  }
  const result = data as RpcResult;
  const response = json(result, result.ok ? 200 : 409);
  if (result.ok) {
    // Sesión corta de gestión para que la persona pueda cambiar/cancelar sin esperar el correo.
    const token = randomToken();
    const managed = await ctx.db.rpc("manage_session_from_booking", {
      p_booking_session_hash: ctx.sessionHash,
      p_session_hash: sha256Hex(token),
    });
    if (!managed.error && (managed.data as RpcResult)?.ok) setSessionCookie(response, MANAGE_COOKIE, token, 30 * 60);
    // Optimización: intenta enviar ya. La garantía de entrega es el cron del outbox.
    const appointmentId = (result.appointment as { appointment_id?: string } | undefined)?.appointment_id ?? null;
    after(() => processOutbox(10, appointmentId).catch(() => undefined));
  }
  return response;
}
