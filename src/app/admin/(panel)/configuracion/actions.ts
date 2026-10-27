"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { checkbox, firstIssue, optText } from "@/features/cms/admin/form-helpers";
import { SETTINGS_TAG } from "@/features/cms/queries";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";
import { normalizePhone } from "@/lib/validation";

const phone = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: `Teléfono inválido: ${v}` });
      return z.NEVER;
    }
    return p;
  });

/** «1-5 09:00-18:00» o «6 09:00-13:00» por línea → [{ days, opens, closes }] */
function parseHours(text: string) {
  const out: { days: number[]; opens: string; closes: string }[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = /^([1-7](?:-[1-7])?(?:,[1-7](?:-[1-7])?)*)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(line);
    if (!m) throw new Error(`Horario inválido: «${line}». Formato: 1-5 09:00-18:00`);
    const days = new Set<number>();
    for (const part of m[1]!.split(",")) {
      const [a, b] = part.split("-").map(Number);
      for (let d = a!; d <= (b ?? a)!; d++) days.add(d);
    }
    if (m[3]! <= m[2]!) throw new Error(`Horario inválido: «${line}»`);
    out.push({ days: [...days].sort(), opens: m[2]!, closes: m[3]! });
  }
  return out;
}

export async function savePublicSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin"]);
  const url = z.union([z.literal(""), z.url().startsWith("https://", "Usa un enlace https://")]).transform((v) => v || undefined);
  const parsed = z
    .object({
      clinic_name: z.string().trim().min(2).max(120),
      legal_name: optText(200),
      ruc: z.string().trim().regex(/^(\d{11})?$/, "RUC: 11 dígitos").transform((v) => v || null),
      address_line: optText(200),
      address_reference: optText(200),
      district: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      region: z.string().trim().min(2).max(80),
      postal_code: z.string().trim().regex(/^(\d{5})?$/, "Código postal: 5 dígitos").transform((v) => v || null),
      latitude: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().min(-90).max(90).nullable()),
      longitude: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().min(-180).max(180).nullable()),
      phone_e164: phone,
      whatsapp_e164: phone,
      public_email: z.union([z.literal(""), z.email("Correo inválido")]).transform((v) => v || null),
      opening_hours: z.string().max(1000).default(""),
      opening_hours_note: optText(300),
      instagram: url,
      facebook: url,
      tiktok: url,
      youtube: url,
      linkedin: url,
      google_maps_url: z.union([z.literal(""), z.url().startsWith("https://")]).transform((v) => v || null),
      ga4_measurement_id: z.string().trim().regex(/^(G-[A-Z0-9]{4,16})?$/, "ID de medición GA4: G-XXXXXXX").transform((v) => v || null),
      gsc_verification_token: z.string().trim().regex(/^([A-Za-z0-9_-]{10,100})?$/, "Token de verificación inválido").transform((v) => v || null),
      booking_mode: z.enum(["off", "reception", "automatic"]),
      complaints_book_enabled: checkbox,
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { instagram, facebook, tiktok, youtube, linkedin, opening_hours, ...rest } = parsed.data;
  let hours;
  try {
    hours = parseHours(opening_hours);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const social = Object.fromEntries(Object.entries({ instagram, facebook, tiktok, youtube, linkedin }).filter(([, v]) => v));
  const { error } = await supabase
    .from("clinic_settings_public")
    .update({ ...rest, opening_hours: hours, social_links: social, updated_by: userId })
    .eq("id", true);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Configuración pública guardada. La web se actualiza en la próxima visita." };
}

export async function savePrivateSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin"]);
  const n = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
  const parsed = z
    .object({
      hold_minutes: n(2, 30),
      min_notice_minutes: n(0, 10080),
      max_horizon_days: n(1, 365),
      pending_expiry_hours: n(1, 168),
      cancellation_window_hours: n(0, 336),
      reminder_hours_before: n(1, 168),
      reception_notification_email: z.union([z.literal(""), z.email("Correo inválido")]).transform((v) => v || null),
      access_link_ttl_hours: n(1, 336),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { error } = await supabase.from("clinic_settings_private").update({ ...parsed.data, updated_by: userId }).eq("id", true);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Parámetros de agenda guardados." };
}
