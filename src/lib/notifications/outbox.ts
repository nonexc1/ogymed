import "server-only";

import { randomUUID } from "node:crypto";

import { getSettings, listDoctors } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";
import { requireServerSecret } from "@/lib/env.server";
import { hmacHex, sha256Hex } from "@/lib/security/crypto";
import { getServiceClient } from "@/lib/supabase/service";

import { patientEmail, receptionEmail } from "./templates";
import { sendEmail } from "./transport";

type Context = {
  id: string;
  kind: string;
  recipient: "patient" | "reception";
  dedupe_key: string;
  stale: boolean;
  to: string | null;
  contact_id: string | null;
  first_name: string | null;
  appointment: { id: string; status: string; starts_at: string; ends_at: string; doctor_id: string } | null;
};

const LINK_KINDS = new Set(["booking_confirmed", "booking_received", "booking_rescheduled", "booking_reminder", "access_link"]);

/**
 * Procesa mensajes pendientes del outbox. Seguro ante ejecuciones concurrentes (reclamo con
 * FOR UPDATE SKIP LOCKED + lease) y ante reintentos (clave de idempotencia = dedupe_key).
 */
export async function processOutbox(
  limit = 20,
  appointmentId: string | null = null,
): Promise<{ claimed: number; sent: number; skipped: number; failed: number }> {
  const db = getServiceClient();
  const stats = { claimed: 0, sent: 0, skipped: 0, failed: 0 };
  if (!db) return stats;
  const worker = `w-${randomUUID()}`;
  const { data: rows, error } = await db.rpc("outbox_claim", {
    p_worker: worker,
    p_limit: limit,
    p_lease_seconds: 120,
    p_appointment_id: appointmentId,
  });
  if (error) {
    console.error("outbox_claim_error", { code: error.code });
    return stats;
  }
  const claimed = (rows ?? []) as { id: string }[];
  stats.claimed = claimed.length;
  if (!claimed.length) return stats;

  const [settings, doctors] = await Promise.all([getSettings(), listDoctors()]);
  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.display_name ?? null;

  for (const { id } of claimed) {
    const complete = (result: "sent" | "skipped" | "retry" | "failed", err?: string, providerId?: string) =>
      db.rpc("outbox_complete", { p_id: id, p_worker: worker, p_result: result, p_error: err ?? null, p_provider_id: providerId ?? null });

    const { data: ctxData, error: ctxError } = await db.rpc("outbox_context", { p_id: id });
    const ctx = ctxData as Context | null;
    if (ctxError || !ctx) {
      await complete("retry", "context_unavailable");
      stats.failed++;
      continue;
    }
    if (ctx.stale) {
      await complete("skipped", "stale");
      stats.skipped++;
      continue;
    }
    if (!ctx.to) {
      await complete("skipped", "no_recipient");
      stats.skipped++;
      continue;
    }

    const appointment = ctx.appointment
      ? { ...ctx.appointment, doctorName: doctorName(ctx.appointment.doctor_id) }
      : null;

    let manageUrl: string | null = null;
    if (ctx.recipient === "patient" && LINK_KINDS.has(ctx.kind) && ctx.contact_id) {
      // Token derivado del ID del mensaje con la pimienta del servidor: los reintentos generan el mismo
      // contenido (requisito de la idempotencia del proveedor). En la base sólo queda su hash.
      const token = hmacHex(requireServerSecret("BOOKING_CODE_PEPPER"), `manage-link:${id}`);
      const { error: tokenError } = await db.rpc("manage_issue_token", {
        p_contact_id: ctx.contact_id,
        p_appointment_id: ctx.appointment?.id ?? null,
        p_token_hash: sha256Hex(token),
      });
      if (tokenError) {
        await complete("retry", "token_issue_failed");
        stats.failed++;
        continue;
      }
      // Fragmento (#): nunca se envía al servidor, ni a logs, ni en el Referer.
      manageUrl = `${siteUrl}/cita/acceso#t=${token}`;
    }

    const email =
      ctx.recipient === "patient"
        ? patientEmail(ctx.kind, settings, ctx.first_name, appointment, manageUrl, ctx.appointment?.id ?? null)
        : receptionEmail(ctx.kind, settings, appointment);
    if (!email) {
      await complete("skipped", "no_template");
      stats.skipped++;
      continue;
    }

    const result = await sendEmail({ to: ctx.to, ...email, idempotencyKey: ctx.dedupe_key });
    if (result.ok) {
      await complete("sent", undefined, result.id);
      stats.sent++;
    } else {
      await complete(result.retryable ? "retry" : "failed", result.error);
      stats.failed++;
    }
  }
  return stats;
}
