"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { CONTENT_TAG } from "@/features/cms/queries";
import { firstIssue } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

// El proxy aplica 301 en estas secciones (ver src/proxy.ts).
const path = z
  .string()
  .trim()
  .regex(/^\/(servicios|equipo|blog)\/[a-z0-9]+(-[a-z0-9]+)*$/, "Ruta: /servicios/…, /equipo/… o /blog/… (sin dominio ni parámetros)");

export async function createRedirect(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin", "editor"]);
  const parsed = z.object({ from_path: path, to_path: z.string().trim().regex(/^\/[^?#\s]*$/, "Destino: ruta interna que empiece con /") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { error } = await supabase.from("redirects").insert({ ...parsed.data, source: "manual", created_by: userId });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/redirecciones");
  return { ok: true, message: "Redirección 301 creada (activa en ≤ 1 minuto)." };
}

export async function deleteRedirect(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Inválido." };
  const { error } = await supabase.from("redirects").delete().eq("id", id.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/redirecciones");
  return { ok: true, message: "Eliminada." };
}
