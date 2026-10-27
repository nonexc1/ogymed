"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

export async function updateComplaint(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ id: z.uuid(), status: z.enum(["received", "in_progress", "answered", "closed"]), response: z.string().max(4000).default("") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Inválido." };
  const { error } = await supabase.rpc("admin_update_complaint", { p_id: parsed.data.id, p_status: parsed.data.status, p_response: parsed.data.response });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/reclamaciones");
  return { ok: true, message: "Actualizado." };
}

export async function updatePrivacyRequest(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const parsed = z.object({ id: z.uuid(), status: z.enum(["received", "identity_check", "in_progress", "resolved", "rejected"]), note: z.string().max(2000).default("") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Inválido." };
  const { error } = await supabase.rpc("admin_update_privacy_request", { p_id: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/reclamaciones");
  return { ok: true, message: "Actualizado." };
}
