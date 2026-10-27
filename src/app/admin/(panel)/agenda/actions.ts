"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { dbErrorMessage, SLOT_ERRORS } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";
import { normalizePhone } from "@/lib/validation";

type Rpc = { ok: boolean; code?: string; appointment?: { appointment_id: string } };

const fail = (message: string): ActionResult => ({ ok: false, message });
const rpcFail = (r: Rpc | null) => fail(SLOT_ERRORS[r?.code ?? ""] ?? "No se pudo completar la operación.");

/** Horarios válidos para personal (mismas reglas de agenda y capacidad que la web, sin antelación mínima). */
export async function fetchStaffSlots(serviceId: string, doctorId: string | null, date: string) {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const parsed = z.object({ s: z.uuid(), d: z.uuid().nullable(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ s: serviceId, d: doctorId, date });
  if (!parsed.success) return { ok: false as const, slots: [] };
  const { data, error } = await supabase.rpc("staff_slots", { p_service_id: serviceId, p_doctor_id: doctorId, p_from: date, p_to: date });
  if (error) return { ok: false as const, slots: [] };
  return { ok: true as const, slots: (data ?? []) as { doctor_id: string; starts_at: string; ends_at: string }[] };
}

const createSchema = z.object({
  service_id: z.uuid({ error: "Elige un servicio" }),
  doctor_id: z.uuid({ error: "Elige un horario" }),
  starts_at: z.iso.datetime({ offset: true, error: "Elige un horario" }),
  full_name: z.string().trim().min(2, "Escribe el nombre").max(120),
  phone: z.string().trim().max(20).optional().default(""),
  email: z.union([z.literal(""), z.email("Correo inválido")]).default(""),
  origin: z.enum(["phone", "whatsapp", "in_person", "other"]),
  confirm: z.enum(["confirmed", "pending"]),
  notify: z.string().optional(),
  note: z.string().trim().max(500).optional().default(""),
});

export async function createAppointment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const parsed = createSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa los datos.");
  const v = parsed.data;
  const phone = v.phone ? normalizePhone(v.phone) : null;
  if (v.phone && !phone) return fail("Teléfono inválido (ej. 987 654 321 o +51…).");
  const { data, error } = await supabase.rpc("staff_create_appointment", {
    p_service_id: v.service_id,
    p_doctor_id: v.doctor_id,
    p_starts_at: v.starts_at,
    p_full_name: v.full_name,
    p_phone: phone,
    p_email: v.email || null,
    p_origin: v.origin,
    p_confirm: v.confirm === "confirmed",
    p_notify: v.notify === "on" && Boolean(v.email),
    p_note: v.note || null,
  });
  if (error) return fail(dbErrorMessage(error));
  const r = data as Rpc;
  if (!r.ok) return rpcFail(r);
  revalidatePath("/admin/agenda");
  redirect(`/admin/citas/${r.appointment!.appointment_id}`);
}

export async function transitionAppointment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception", "professional"]);
  const parsed = z
    .object({
      id: z.uuid(),
      to: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
      reason: z.enum(["patient_request", "clinic_reschedule", "no_longer_needed", "duplicate", "other"]).optional(),
      notify: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("Datos inválidos.");
  const { data, error } = await supabase.rpc("staff_transition_appointment", {
    p_appointment_id: parsed.data.id,
    p_to: parsed.data.to,
    p_reason: parsed.data.reason ?? null,
    p_notify: parsed.data.notify === "on",
  });
  if (error) return fail(dbErrorMessage(error));
  const r = data as Rpc;
  if (!r.ok) return rpcFail(r);
  revalidatePath(`/admin/citas/${parsed.data.id}`);
  return { ok: true, message: "Estado actualizado." };
}

export async function rescheduleAppointment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const parsed = z
    .object({ id: z.uuid(), doctor_id: z.uuid({ error: "Elige un horario" }), starts_at: z.iso.datetime({ offset: true, error: "Elige un horario" }), notify: z.string().optional() })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Elige un horario.");
  const { data, error } = await supabase.rpc("staff_reschedule_appointment", {
    p_appointment_id: parsed.data.id,
    p_doctor_id: parsed.data.doctor_id,
    p_starts_at: parsed.data.starts_at,
    p_notify: parsed.data.notify === "on",
  });
  if (error) return fail(dbErrorMessage(error));
  const r = data as Rpc;
  if (!r.ok) return { ok: false, message: `${SLOT_ERRORS[r.code ?? ""] ?? "No se pudo reprogramar."} La cita original no cambió.` };
  revalidatePath(`/admin/citas/${parsed.data.id}`);
  return { ok: true, message: "Cita reprogramada." };
}

export async function updateAppointmentNote(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const parsed = z.object({ id: z.uuid(), note: z.string().max(500) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("La nota admite hasta 500 caracteres.");
  const { error } = await supabase.rpc("staff_update_appointment_note", { p_appointment_id: parsed.data.id, p_note: parsed.data.note });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/admin/citas/${parsed.data.id}`);
  return { ok: true, message: "Nota guardada." };
}

export async function retryNotification(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Aviso inválido.");
  const { error } = await supabase.rpc("staff_retry_notification", { p_outbox_id: id.data });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/agenda/avisos");
  return { ok: true, message: "Reintento programado." };
}
