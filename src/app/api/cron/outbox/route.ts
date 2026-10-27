import type { NextRequest } from "next/server";

import { fail, json } from "@/lib/api";
import { processOutbox } from "@/lib/notifications/outbox";
import { isAuthorizedCron } from "@/lib/security/cron";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return fail("unauthorized", 401);
  const totals = { claimed: 0, sent: 0, skipped: 0, failed: 0 };
  // Hasta 3 lotes por invocación; el resto queda para la siguiente.
  for (let i = 0; i < 3; i++) {
    const r = await processOutbox(25);
    totals.claimed += r.claimed;
    totals.sent += r.sent;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
    if (r.claimed < 25) break;
  }
  console.info("cron_outbox", totals);
  return json({ ok: true, ...totals });
}
