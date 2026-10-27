import "server-only";

import type { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env.server";

import { safeEqual } from "./crypto";

/** Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado, se rechaza todo. */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}
