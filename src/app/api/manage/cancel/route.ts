import { after, type NextRequest } from "next/server";

import { manageContext } from "@/features/booking/manage-server";
import { manageActionSchema } from "@/features/booking/schema";
import type { RpcResult } from "@/features/booking/server";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const ctx = manageContext(request);
  if (!ctx.ok) return ctx.response;
  const g = await guardedJson(request, manageActionSchema, RATE_LIMITS.manage);
  if (!g.ok) return g.response;
  const { data, error } = await ctx.db.rpc("manage_cancel", { p_session_hash: ctx.sessionHash, p_appointment_id: g.data.appointmentId });
  if (error) {
    logRpcError("manage_cancel", error);
    return fail("unavailable", 503);
  }
  const result = data as RpcResult;
  if (result.ok) after(() => processOutbox(10).catch(() => undefined));
  return json(result, result.ok ? 200 : 409);
}
