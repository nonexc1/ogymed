"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { firstIssue, optText, optUuid } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const time = z.string().regex(/^(\d{2}:\d{2})?$/).optional().default("");

/** Feriados (toda la sede), ausencias y bloqueos. Las horas se interpretan en hora de Lima. */
export async function addException(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin", "reception"]);
  const parsed = z
    .object({ kind: z.enum(["holiday", "absence", "block"]), doctor_id: optUuid, from_date: date, from_time: time, to_date: date, to_time: time, note: optText(200) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const v = parsed.data;
  if (v.kind !== "holiday" && !v.doctor_id) return { ok: false, message: "Elige el profesional (sólo los feriados aplican a toda la sede)." };
  // Lima no aplica horario de verano: UTC−05 fijo.
  const start = new Date(`${v.from_date}T${v.from_time || "00:00"}:00-05:00`);
  const end = v.to_time ? new Date(`${v.to_date}T${v.to_time}:00-05:00`) : new Date(new Date(`${v.to_date}T00:00:00-05:00`).getTime() + 86_400_000);
  if (!(end > start)) return { ok: false, message: "El fin debe ser posterior al inicio." };
  const { error } = await supabase.from("schedule_exceptions").insert({
    kind: v.kind,
    doctor_id: v.kind === "holiday" ? null : v.doctor_id,
    period: `[${start.toISOString()},${end.toISOString()})`,
    note: v.note,
    created_by: userId,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/disponibilidad");
  return { ok: true, message: "Registrado. Las citas ya existentes en ese periodo no se cancelan automáticamente: revísalas en la agenda." };
}

export async function deleteException(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Inválido." };
  const { error } = await supabase.from("schedule_exceptions").delete().eq("id", id.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/disponibilidad");
  return { ok: true, message: "Eliminado." };
}

export async function addResource(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ name: z.string().trim().min(2).max(80), kind: z.enum(["room", "equipment"]) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Nombre inválido." };
  const { error } = await supabase.from("resources").insert(parsed.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/disponibilidad");
  return { ok: true, message: "Recurso creado." };
}

export async function linkResource(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ service_id: z.uuid(), resource_id: z.uuid(), op: z.enum(["add", "remove"]) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Inválido." };
  const { op, ...row } = parsed.data;
  const { error } = op === "add" ? await supabase.from("service_resources").upsert(row) : await supabase.from("service_resources").delete().match(row);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/disponibilidad");
  return { ok: true, message: op === "add" ? "El servicio ahora reserva este recurso." : "Vínculo eliminado." };
}
