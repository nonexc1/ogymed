import type { NextRequest } from "next/server";

import { fail, json, logRpcError } from "@/lib/api";
import { isAuthorizedCron } from "@/lib/security/cron";
import { getServiceClient } from "@/lib/supabase/service";

/** Expira retenciones/solicitudes vencidas y purga sesiones, tokens y límites antiguos. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return fail("unauthorized", 401);
  const db = getServiceClient();
  if (!db) return fail("unavailable", 503);
  const { data, error } = await db.rpc("jobs_maintenance");
  if (error) {
    logRpcError("jobs_maintenance", error);
    return fail("unavailable", 503);
  }
  console.info("cron_maintenance", data);
  return json({ ok: true, result: data });
}
