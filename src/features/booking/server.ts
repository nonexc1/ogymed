import "server-only";

import type { NextRequest } from "next/server";

import { getSettings } from "@/features/cms/queries";
import { fail } from "@/lib/api";
import { bookingInfraReady } from "@/lib/env.server";
import { getServiceClient } from "@/lib/supabase/service";

import { BOOKING_COOKIE, cookieHash } from "./session";

/** Comprobaciones comunes de los endpoints de reserva. */
export async function bookingContext(request: NextRequest) {
  const db = getServiceClient();
  if (!db || !bookingInfraReady) return { ok: false as const, response: fail("unavailable", 503) };
  const settings = await getSettings();
  if (settings.booking_mode === "off") return { ok: false as const, response: fail("booking_disabled", 409) };
  return { ok: true as const, db, settings, sessionHash: cookieHash(request, BOOKING_COOKIE) };
}

export type RpcResult = { ok: boolean; code?: string } & Record<string, unknown>;
