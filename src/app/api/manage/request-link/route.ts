import { after, type NextRequest } from "next/server";

import { requestLinkSchema } from "@/features/booking/schema";
import { guardedJson, json, logRpcError } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";

/** Siempre la misma respuesta, exista o no el correo (evita enumeración). */
export async function POST(request: NextRequest) {
  const g = await guardedJson(request, requestLinkSchema, RATE_LIMITS.manageLink);
  if (!g.ok) return g.response;
  const db = getServiceClient();
  if (db) {
    const { error } = await db.rpc("manage_request_link", { p_email: g.data.email });
    if (error) logRpcError("manage_request_link", error);
    else after(() => processOutbox(10).catch(() => undefined));
  }
  return json({ ok: true });
}
