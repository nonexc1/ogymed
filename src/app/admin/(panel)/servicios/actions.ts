"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { checkbox, firstIssue, optText, optUuid, parseFaqLines, reqText, slugSchema } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage } from "@/lib/auth/errors";
import { hasRole, requireStaff } from "@/lib/auth/staff";

const serviceSchema = z.object({
  name: reqText(3, 120, "Nombre"),
  slug: slugSchema,
  category: optText(80),
  summary: z.string().trim().max(400).default(""),
  body_md: z.string().max(20000).default(""),
  audience_md: z.string().max(6000).default(""),
  what_to_expect_md: z.string().max(8000).default(""),
  preparation_md: z.string().max(6000).default(""),
  faqs: z.string().max(20000).default(""),
  price_pen: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().min(0).max(100000).nullable()),
  price_approved: checkbox,
  show_duration: checkbox,
  hero_media_id: optUuid,
  og_media_id: optUuid,
  seo_title: optText(70),
  seo_description: optText(170),
  sort_order: z.coerce.number().int().min(0).max(10000).default(100),
  active: checkbox,
  online_booking_enabled: checkbox,
});

export async function createService(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z.object({ name: reqText(3, 120, "Nombre"), slug: slugSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { data, error } = await supabase.from("services").insert({ ...parsed.data, active: false }).select("id").single();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  redirect(`/admin/servicios/${data.id}`);
}

export async function saveService(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, staff } = await requireStaff(["admin", "editor"]);
  const id = z.uuid().safeParse(fd.get("id"));
  const parsed = serviceSchema.safeParse(Object.fromEntries(fd));
  if (!id.success || !parsed.success) return { ok: false, message: parsed.success ? "Servicio inválido." : firstIssue(parsed.error) };
  const { faqs, active, online_booking_enabled, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest, faqs: parseFaqLines(faqs) };
  // Campos operativos: sólo administración (la base también lo impide).
  if (hasRole(staff, "admin")) Object.assign(update, { active, online_booking_enabled });
  const { error } = await supabase.from("services").update(update).eq("id", id.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath(`/admin/servicios/${id.data}`);
  return { ok: true, message: "Guardado. Si estaba publicado, los cambios quedan como borrador hasta volver a publicar." };
}
