import type { NextRequest } from "next/server";

import { bookingContext } from "@/features/booking/server";
import { fail, json, logRpcError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  if (!ctx.sessionHash) return json({ ok: true, verified: false, hold: null, serverNow: new Date().toISOString() });
  const { data, error } = await ctx.db.rpc("booking_session_state", { p_token_hash: ctx.sessionHash });
  if (error) {
    logRpcError("booking_session_state", error);
    return fail("unavailable", 503);
  }
  return json({ ...(data as object), serverNow: new Date().toISOString() });
}
