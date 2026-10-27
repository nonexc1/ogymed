import type { NextRequest } from "next/server";
import { z } from "zod";

import { bookingContext } from "@/features/booking/server";
import { fail, json, logRpcError } from "@/lib/api";

/** Consulta el resultado de un intento de confirmación (tras un fallo de red) antes de reintentar. */
export async function GET(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const key = z.uuid().safeParse(request.nextUrl.searchParams.get("key"));
  if (!key.success) return fail("validation", 422);
  if (!ctx.sessionHash) return fail("session_invalid", 409);
  const { data, error } = await ctx.db.rpc("booking_result", { p_session_hash: ctx.sessionHash, p_idempotency_key: key.data });
  if (error) {
    logRpcError("booking_result", error);
    return fail("unavailable", 503);
  }
  return json(data);
}
