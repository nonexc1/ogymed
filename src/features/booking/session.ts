import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { deployEnv } from "@/lib/env";
import { sha256Hex } from "@/lib/security/crypto";

export const BOOKING_COOKIE = "ogymed_booking";
export const MANAGE_COOKIE = "ogymed_manage";

const secure = deployEnv !== "development";

/** En la base sólo existe el hash del token de la cookie. */
export function cookieHash(request: NextRequest, name: string): string | null {
  const raw = request.cookies.get(name)?.value;
  return raw && /^[A-Za-z0-9_-]{40,}$/.test(raw) ? sha256Hex(raw) : null;
}

export function setSessionCookie(response: NextResponse, name: string, token: string, maxAgeSeconds: number) {
  response.cookies.set(name, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
    priority: "high",
  });
}

export function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 0 });
}
