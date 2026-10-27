import "server-only";

import type { NextRequest } from "next/server";

import { fail } from "@/lib/api";
import { getServiceClient } from "@/lib/supabase/service";

import { cookieHash, MANAGE_COOKIE } from "./session";

export function manageContext(request: NextRequest) {
  const db = getServiceClient();
  if (!db) return { ok: false as const, response: fail("unavailable", 503) };
  const sessionHash = cookieHash(request, MANAGE_COOKIE);
  if (!sessionHash) return { ok: false as const, response: fail("session_invalid", 401) };
  return { ok: true as const, db, sessionHash };
}
