import { after, type NextRequest } from "next/server";

import { manageContext } from "@/features/booking/manage-server";
import { rescheduleSchema } from "@/features/booking/schema";
import type { RpcResult } from "@/features/booking/server";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** Reprogramación atómica: si el nuevo horario falla, la cita original queda intacta. */
export async function POST(request: NextRequest) {
  const ctx = manageContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, rescheduleSchema, RATE_LIMITS.manage);
  if (!g.ok) return g.response;
  const { data, error } = await ctx.db.rpc("manage_reschedule", {
    p_session_hash: ctx.sessionHash,
    p_appointment_id: g.data.appointmentId,
    p_doctor_id: g.data.doctorId,
    p_starts_at: g.data.startsAt,
  });
  if (error) {
    logRpcError("manage_reschedule", error);
    return fail("unavailable", 503);
  }
  const result = data as RpcResult;
  if (result.ok) after(() => processOutbox(10).catch(() => undefined));
  return json(result, result.ok ? 200 : 409);
}
