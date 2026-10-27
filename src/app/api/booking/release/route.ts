import type { NextRequest } from "next/server";
import { z } from "zod";

import { bookingContext } from "@/features/booking/server";
import { guardedJson, json } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, z.object({ holdId: z.uuid() }), RATE_LIMITS.hold);
  if (!g.ok) return g.response;
  if (ctx.sessionHash) {
    await ctx.db.rpc("booking_release_hold", { p_session_hash: ctx.sessionHash, p_hold_id: g.data.holdId });
  }
  return json({ ok: true });
}
