import type { NextRequest } from "next/server";

import { clearCookie, cookieHash, MANAGE_COOKIE } from "@/features/booking/session";
import { json } from "@/lib/api";
import { isSameOrigin } from "@/lib/security/request";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ ok: false, code: "bad_origin" }, 403);
  const hash = cookieHash(request, MANAGE_COOKIE);
  const db = getServiceClient();
  if (hash && db) await db.rpc("manage_logout", { p_session_hash: hash });
  const response = json({ ok: true });
  clearCookie(response, MANAGE_COOKIE);
  return response;
}
