"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { CONTENT_TAG, SETTINGS_TAG } from "@/features/cms/queries";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

const ENTITY = z.enum(["service", "doctor", "page", "post", "faq"]);
const ACTION = z.enum(["submit", "publish", "unpublish", "archive", "restore_draft"]);
const MESSAGES: Record<z.infer<typeof ACTION>, string> = {
  submit: "Enviado a revisión.",
  publish: "Publicado. La web se actualizará en la próxima visita.",
  unpublish: "Retirado de la web; queda como borrador.",
  archive: "Archivado y retirado de la web.",
  restore_draft: "Restaurado como borrador.",
};

/** Transición editorial. La base aplica reglas de rol, revisión médica, credenciales y redirecciones 301. */
export async function transitionContent(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor", "professional"]);
  const parsed = z.object({ entity: ENTITY, id: z.uuid(), action: ACTION, back: z.string().startsWith("/admin/") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Solicitud inválida." };
  const { error } = await supabase.rpc("cms_transition", {
    p_entity_type: parsed.data.entity,
    p_entity_id: parsed.data.id,
    p_action: parsed.data.action,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  updateTag(CONTENT_TAG);
  revalidatePath(parsed.data.back);
  return { ok: true, message: MESSAGES[parsed.data.action] };
}

export async function restoreRevision(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z.object({ revision: z.coerce.number().int().positive(), back: z.string().startsWith("/admin/") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Solicitud inválida." };
  const { error } = await supabase.rpc("cms_restore_revision", { p_revision_id: parsed.data.revision });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath(parsed.data.back);
  return { ok: true, message: "Versión restaurada como borrador. Revísala y vuelve a publicar." };
}

/** Tras guardar configuración pública. */
export async function refreshSettingsCache() {
  updateTag(SETTINGS_TAG);
}
