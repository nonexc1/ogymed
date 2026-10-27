"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { checkbox, firstIssue, optUuid } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage, SLOT_ERRORS } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";
import { siteUrl } from "@/lib/env";
import { getAuthAdminClient } from "@/lib/supabase/service";

const ROLES = ["admin", "reception", "professional", "editor"] as const;
const rolesFrom = (fd: FormData) => fd.getAll("roles").map(String).filter((r): r is (typeof ROLES)[number] => (ROLES as readonly string[]).includes(r));

const staffSchema = z.object({
  display_name: z.string().trim().min(2, "Nombre muy corto").max(120),
  doctor_id: optUuid,
  can_review_medical: checkbox,
});

async function upsertStaff(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
  userId: string,
  data: z.infer<typeof staffSchema>,
  roles: string[],
  active: boolean,
): Promise<ActionResult> {
  const { data: res, error } = await supabase.rpc("admin_upsert_staff", {
    p_user_id: userId,
    p_display_name: data.display_name,
    p_roles: roles,
    p_doctor_id: data.doctor_id,
    p_can_review_medical: data.can_review_medical,
    p_active: active,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const r = res as { ok: boolean; code?: string };
  if (!r.ok) return { ok: false, message: SLOT_ERRORS[r.code ?? ""] ?? "No se pudo guardar." };
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Guardado." };
}

/**
 * Invitación: primero se verifica admin + MFA con la sesión; sólo entonces se usa la clave secreta
 * para la API de invitaciones de Auth. El rol se asigna con la sesión del admin (auditado en SQL).
 */
export async function inviteStaff(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const email = z.email("Correo inválido").safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!email.success || !parsed.success) return { ok: false, message: email.success ? firstIssue(parsed.error!) : "Correo inválido" };
  const roles = rolesFrom(fd);
  if (!roles.length) return { ok: false, message: "Asigna al menos un rol." };
  const { data, error } = await getAuthAdminClient().inviteUserByEmail(email.data, { redirectTo: `${siteUrl}/admin/confirmar` });
  if (error || !data.user) {
    return { ok: false, message: error?.code === "email_exists" || error?.status === 422 ? "Ya existe un usuario con ese correo." : "No se pudo enviar la invitación (revisa el SMTP de Auth)." };
  }
  const result = await upsertStaff(supabase, data.user.id, parsed.data, roles, true);
  return result.ok ? { ok: true, message: `Invitación enviada a ${email.data}.` } : result;
}

export async function updateStaff(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin"]);
  const id = z.uuid().safeParse(fd.get("user_id"));
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!id.success || !parsed.success) return { ok: false, message: parsed.success ? "Inválido." : firstIssue(parsed.error) };
  return upsertStaff(supabase, id.data, parsed.data, rolesFrom(fd), fd.get("active") === "on");
}

/** Recuperación operativa de MFA: elimina los factores para que la persona vuelva a inscribirse. */
export async function resetStaffMfa(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin"]);
  const id = z.uuid().safeParse(fd.get("user_id"));
  if (!id.success) return { ok: false, message: "Inválido." };
  if (id.data === userId) return { ok: false, message: "Otro administrador debe restablecer tu MFA." };
  const admin = getAuthAdminClient();
  const { data, error } = await admin.mfa.listFactors({ userId: id.data });
  if (error) return { ok: false, message: "No se pudieron leer los factores." };
  for (const f of data.factors) await admin.mfa.deleteFactor({ id: f.id, userId: id.data });
  await admin.signOut(id.data).catch(() => undefined);
  await supabase.rpc("admin_record_mfa_reset", { p_user_id: id.data });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "MFA restablecido. Deberá configurarlo en su próximo ingreso." };
}

