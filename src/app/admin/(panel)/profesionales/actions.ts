"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { checkbox, firstIssue, optText, optUuid, reqText, slugSchema } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage } from "@/lib/auth/errors";
import { hasRole, requireStaff } from "@/lib/auth/staff";

const ok = (message: string): ActionResult => ({ ok: true, message });
const bad = (message: string): ActionResult => ({ ok: false, message });

export async function createDoctor(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z.object({ full_name: reqText(3, 120, "Nombre"), slug: slugSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { data, error } = await supabase.from("doctors").insert({ ...parsed.data, active: false }).select("id").single();
  if (error) return bad(dbErrorMessage(error));
  redirect(`/admin/profesionales/${data.id}`);
}

const doctorSchema = z.object({
  id: z.uuid(),
  full_name: reqText(3, 120, "Nombre"),
  slug: slugSchema,
  honorific: z.enum(["", "Dra.", "Dr.", "Obst.", "Lic."]).transform((v) => v || null),
  specialty: optText(120),
  cmp_number: z.string().trim().regex(/^(\d{3,7})?$/, "CMP: sólo números").transform((v) => v || null),
  rne_number: z.string().trim().regex(/^(\d{3,7})?$/, "RNE: sólo números").transform((v) => v || null),
  bio_md: z.string().max(8000).default(""),
  background_md: z.string().max(8000).default(""),
  photo_media_id: optUuid,
  og_media_id: optUuid,
  seo_title: optText(70),
  seo_description: optText(170),
  sort_order: z.coerce.number().int().min(0).max(10000).default(100),
  credentials_verified: checkbox,
  active: checkbox,
  online_booking_enabled: checkbox,
});

export async function saveDoctor(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, staff } = await requireStaff(["admin", "editor"]);
  const parsed = doctorSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { id, credentials_verified, active, online_booking_enabled, ...rest } = parsed.data;
  const update: Record<string, unknown> = rest;
  if (hasRole(staff, "admin")) Object.assign(update, { credentials_verified, active, online_booking_enabled });
  const { error } = await supabase.from("doctors").update(update).eq("id", id);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/profesionales/${id}`);
  return ok("Guardado. Si el perfil estaba publicado, vuelve a publicarlo para reflejar los cambios.");
}

export async function upsertDoctorService(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z
    .object({
      doctor_id: z.uuid(),
      service_id: z.uuid({ error: "Elige un servicio" }),
      duration_minutes: z.coerce.number().int().min(5).max(480),
      buffer_before_minutes: z.coerce.number().int().min(0).max(120).default(0),
      buffer_after_minutes: z.coerce.number().int().min(0).max(120).default(0),
      online_booking: checkbox,
      active: checkbox,
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { error } = await supabase.from("doctor_services").upsert(parsed.data, { onConflict: "doctor_id,service_id" });
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/profesionales/${parsed.data.doctor_id}`);
  return ok("Servicio guardado. Las citas ya registradas conservan su duración.");
}

export async function deleteDoctorService(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ doctor_id: z.uuid(), service_id: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad("Solicitud inválida.");
  const { error } = await supabase.from("doctor_services").delete().match(parsed.data);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/profesionales/${parsed.data.doctor_id}`);
  return ok("Servicio retirado.");
}

const time = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida");

export async function addScheduleRule(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const days = fd.getAll("weekday").map(Number);
  const parsed = z
    .object({
      doctor_id: z.uuid(),
      start_time: time,
      end_time: time,
      slot_interval_minutes: z.coerce.number().int().min(5).max(240),
      valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      valid_until: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).transform((v) => v || null),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  if (!days.length || days.some((d) => d < 1 || d > 7)) return bad("Elige al menos un día.");
  if (parsed.data.end_time <= parsed.data.start_time) return bad("La hora de fin debe ser posterior al inicio.");
  const rows = days.map((weekday) => ({ ...parsed.data, weekday }));
  const { error } = await supabase.from("schedule_rules").insert(rows);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/profesionales/${parsed.data.doctor_id}`);
  return ok("Bloque de horario agregado.");
}

export async function deleteScheduleRule(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ id: z.uuid(), doctor_id: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad("Solicitud inválida.");
  const { error } = await supabase.from("schedule_rules").delete().eq("id", parsed.data.id);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/profesionales/${parsed.data.doctor_id}`);
  return ok("Bloque eliminado. Las citas existentes no se modifican.");
}
