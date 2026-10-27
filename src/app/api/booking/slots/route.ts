import type { NextRequest } from "next/server";

import { bookingContext } from "@/features/booking/server";
import { slotsQuerySchema } from "@/features/booking/schema";
import { fail, json, logRpcError } from "@/lib/api";
import { clientKey } from "@/lib/security/request";
import { hitRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

/** Disponibilidad pública: sólo horarios y profesional asignable, nunca datos de otras citas. */
export async function GET(request: NextRequest) {
  const ctx = await bookingContext(request);
  if (!ctx.ok) return ctx.response;
  if (!(await hitRateLimit(RATE_LIMITS.slots, clientKey(request)))) return fail("rate_limited", 429);
  const parsed = slotsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return fail("validation", 422);
  const q = parsed.data;
  const { data, error } = await ctx.db.rpc("booking_slots", {
    p_service_id: q.service,
    p_doctor_id: q.doctor ?? null,
    p_from: q.from,
    p_to: q.to,
  });
  if (error) {
    logRpcError("booking_slots", error);
    return fail("unavailable", 503);
  }
  return json({ ok: true, slots: data ?? [], serverNow: new Date().toISOString() });
}
