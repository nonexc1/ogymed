"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

export async function updateContactRequest(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const parsed = z.object({ id: z.uuid(), status: z.enum(["new", "in_progress", "handled", "spam"]) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Inválido." };
  const { error } = await supabase.rpc("staff_update_contact_request", { p_id: parsed.data.id, p_status: parsed.data.status });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/solicitudes");
  return { ok: true, message: "Actualizado." };
}
