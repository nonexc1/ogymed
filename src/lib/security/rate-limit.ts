import "server-only";

import { getServiceClient } from "@/lib/supabase/service";

export type RateLimitRule = { bucket: string; limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  slots: { bucket: "slots", limit: 120, windowSeconds: 600 },
  hold: { bucket: "hold", limit: 30, windowSeconds: 600 },
  verifyStart: { bucket: "verify_start", limit: 6, windowSeconds: 3600 },
  verifyCode: { bucket: "verify_code", limit: 20, windowSeconds: 3600 },
  confirm: { bucket: "confirm", limit: 20, windowSeconds: 3600 },
  manage: { bucket: "manage", limit: 30, windowSeconds: 600 },
  manageLink: { bucket: "manage_link", limit: 5, windowSeconds: 3600 },
  contact: { bucket: "contact", limit: 5, windowSeconds: 3600 },
  complaint: { bucket: "complaint", limit: 5, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

/** Límite persistente en PostgreSQL (sobrevive a instancias serverless). Falla cerrado si la BD no responde. */
export async function hitRateLimit(rule: RateLimitRule, key: string): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;
  const { data, error } = await db.rpc("rate_limit_hit", {
    p_bucket: rule.bucket,
    p_key_hash: key,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });
  if (error) {
    console.error("rate_limit_error", { bucket: rule.bucket, code: error.code });
    return false;
  }
  return data === true;
}
