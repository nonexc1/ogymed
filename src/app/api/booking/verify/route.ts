import type { NextRequest } from "next/server";

import { bookingContactSchema } from "@/features/booking/schema";
import { bookingContext, type RpcResult } from "@/features/booking/server";
import { getPrivacyVersion } from "@/features/cms/queries";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { requireServerSecret } from "@/lib/env.server";
import { verificationCodeEmail } from "@/lib/notifications/templates";
import { sendEmail } from "@/lib/notifications/transport";
import { hmacHex, sixDigitCode } from "@/lib/security/crypto";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** Guarda el contacto mínimo y envía un código de 6 dígitos al correo (HMAC con pimienta en la base). */
export async function POST(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, bookingContactSchema, RATE_LIMITS.verifyStart);
  if (!g.ok) return g.response;
  if (!ctx.sessionHash) return fail("session_invalid", 409);
  if (!(await getPrivacyVersion())) return fail("privacy_unpublished", 409);

  const code = sixDigitCode();
  const codeHash = hmacHex(requireServerSecret("BOOKING_CODE_PEPPER"), `${ctx.sessionHash}:${code}`);
  const { data, error } = await ctx.db.rpc("booking_start_verification", {
    p_session_hash: ctx.sessionHash,
    p_name: g.data.full_name,
    p_email: g.data.email,
    p_phone: g.data.phone,
    p_code_hash: codeHash,
  });
  if (error) {
    logRpcError("booking_start_verification", error);
    return fail("unavailable", 503);
  }
  const result = data as RpcResult & { already_verified?: boolean; code_expires_at?: string };
  if (!result.ok) return json(result, 409);
  if (result.already_verified) return json({ ok: true, alreadyVerified: true });

  const ttl = Math.max(1, Math.round((Date.parse(result.code_expires_at!) - Date.now()) / 60_000));
  const sent = await sendEmail({ to: g.data.email, ...verificationCodeEmail(ctx.settings, code, ttl) });
  if (!sent.ok) {
    console.error("verification_email_failed", { error: sent.error });
    return fail("email_failed", 502);
  }
  return json({ ok: true, alreadyVerified: false, codeExpiresAt: result.code_expires_at });
}
