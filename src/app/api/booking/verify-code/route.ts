import type { NextRequest } from "next/server";

import { codeSchema } from "@/features/booking/schema";
import { bookingContext, type RpcResult } from "@/features/booking/server";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { requireServerSecret } from "@/lib/env.server";
import { hmacHex } from "@/lib/security/crypto";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, codeSchema, RATE_LIMITS.verifyCode);
  if (!g.ok) return g.response;
  if (!ctx.sessionHash) return fail("session_invalid", 409);
  const { data, error } = await ctx.db.rpc("booking_verify_code", {
    p_session_hash: ctx.sessionHash,
    p_code_hash: hmacHex(requireServerSecret("BOOKING_CODE_PEPPER"), `${ctx.sessionHash}:${g.data.code}`),
  });
  if (error) {
    logRpcError("booking_verify_code", error);
    return fail("unavailable", 503);
  }
  const result = data as RpcResult;
  return json(result, result.ok ? 200 : 409);
}
