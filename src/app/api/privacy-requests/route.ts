import type { NextRequest } from "next/server";

import { privacyRequestSchema } from "@/features/privacy/schema";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const g = await guardedJson(request, privacyRequestSchema, RATE_LIMITS.contact);
  if (!g.ok) return g.response;
  if (g.data.website) return json({ ok: true });
  const db = getServiceClient();
  if (!db) return fail("unavailable", 503);
  const { error } = await db.rpc("privacy_request_create", {
    p_kind: g.data.kind,
    p_name: g.data.requester_name,
    p_email: g.data.email,
    p_detail: g.data.detail,
  });
  if (error) {
    logRpcError("privacy_request_create", error);
    return fail("unavailable", 503);
  }
  return json({ ok: true });
}
