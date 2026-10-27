import { after, type NextRequest } from "next/server";

import { complaintSchema } from "@/features/complaints/schema";
import { getPrivacyVersion, getSettings } from "@/features/cms/queries";
import { fail, guardedJson, json, logRpcError } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const settings = await getSettings();
  if (!settings.complaints_book_enabled) return fail("disabled", 409);
  const g = await guardedJson(request, complaintSchema, RATE_LIMITS.complaint);
  if (!g.ok) return g.response;
  if (g.data.website) return json({ ok: true, code: "LR-0000-000000", created_at: new Date().toISOString() });
  const version = await getPrivacyVersion();
  if (!version) return fail("privacy_unpublished", 409);
  const db = getServiceClient();
  if (!db) return fail("unavailable", 503);
  const d = g.data;
  const payload = {
    kind: d.kind,
    consumer_name: d.consumer_name,
    document_type: d.document_type,
    document_number: d.document_number,
    address: d.address,
    phone_e164: d.phone_e164,
    email: d.email,
    is_minor: d.is_minor,
    guardian_name: d.guardian_name,
    service_description: d.service_description,
    amount_pen: d.amount_pen,
    detail: d.detail,
    consumer_request: d.consumer_request,
    privacy_version: version,
  };
  const { data, error } = await db.rpc("complaint_create", { p: payload });
  if (error) {
    logRpcError("complaint_create", error);
    return fail("unavailable", 503);
  }
  after(() => processOutbox(5).catch(() => undefined));
  return json(data);
}
