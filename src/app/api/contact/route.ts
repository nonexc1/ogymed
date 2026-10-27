import type { NextRequest } from "next/server";

import { contactSchema } from "@/features/contact/schema";
import { getPrivacyVersion } from "@/features/cms/queries";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const g = await guardedJson(request, contactSchema, RATE_LIMITS.contact);
  if (!g.ok) return g.response;
  // Honeypot completado: respuesta idéntica al éxito, sin guardar nada.
  if (g.data.website) return json({ ok: true });
  const version = await getPrivacyVersion();
  if (!version) return fail("privacy_unpublished", 409);
  const db = getServiceClient();
  if (!db) return fail("unavailable", 503);
  const { error } = await db.rpc("contact_request_create", {
    p_full_name: g.data.full_name,
    p_email: g.data.email || null,
    p_phone: g.data.phone,
    p_topic: g.data.topic,
    p_message: g.data.message ?? "",
    p_privacy_version: version,
  });
  if (error) {
    logRpcError("contact_request_create", error);
    return fail("unavailable", 503);
  }
  return json({ ok: true });
}
