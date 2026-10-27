import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

import { clientKey, isSameOrigin } from "@/lib/security/request";
import { hitRateLimit, type RateLimitRule } from "@/lib/security/rate-limit";

const NO_STORE = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer" };

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });

export const fail = (code: string, status = 400) => json({ ok: false, code }, status);

/**
 * Guardas comunes para endpoints públicos que mutan estado: mismo origen, límite de frecuencia
 * persistente y validación Zod. Nunca registra el cuerpo de la petición.
 */
export async function guardedJson<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
  rule: RateLimitRule,
): Promise<{ ok: true; data: z.output<S>; key: string } | { ok: false; response: NextResponse }> {
  if (!isSameOrigin(request)) return { ok: false, response: fail("bad_origin", 403) };
  const key = clientKey(request);
  if (!(await hitRateLimit(rule, key))) return { ok: false, response: fail("rate_limited", 429) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: fail("invalid_json") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: json({ ok: false, code: "validation", fields: parsed.error.issues.map((i) => i.path.join(".")) }, 422),
    };
  }
  return { ok: true, data: parsed.data, key };
}

/** Registra errores de RPC sin datos personales: sólo nombre de operación y código. */
export function logRpcError(op: string, error: { code?: string; message?: string } | null) {
  if (error) console.error("rpc_error", { op, code: error.code ?? "unknown" });
}
