"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { checkbox, firstIssue, optText } from "@/features/cms/admin/form-helpers";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2000;

const metaSchema = z.object({
  alt_text: z.string().trim().max(300).default(""),
  caption: optText(300),
  rights_confirmed: checkbox,
  rights_holder: optText(200),
  rights_note: optText(500),
});

/**
 * Sube una imagen: valida tipo y tamaño, la reorienta, la redimensiona (≤ 2000 px), la convierte a
 * WebP y elimina metadatos (EXIF/GPS). next/image genera luego AVIF/WebP responsivas.
 */
export async function uploadMedia(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireStaff(["admin", "editor"]);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige un archivo." };
  if (!ALLOWED.has(file.type)) return { ok: false, message: "Formato no permitido. Usa JPG, PNG, WebP o AVIF." };
  if (file.size > MAX_BYTES) return { ok: false, message: "La imagen supera 4 MB. Redúcela antes de subirla." };
  const meta = metaSchema.safeParse(Object.fromEntries(fd));
  if (!meta.success) return { ok: false, message: firstIssue(meta.error) };

  let output: { data: Buffer; info: { width: number; height: number } };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, message: "No se pudo procesar la imagen (¿archivo dañado?)." };
  }
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.webp`;
  const upload = await supabase.storage.from("public-media").upload(path, output.data, { contentType: "image/webp", upsert: false });
  if (upload.error) return { ok: false, message: "No se pudo subir la imagen al almacenamiento." };
  const { error } = await supabase.from("media_assets").insert({
    bucket: "public-media",
    path,
    mime_type: "image/webp",
    width: output.info.width,
    height: output.info.height,
    size_bytes: output.data.length,
    uploaded_by: userId,
    ...meta.data,
  });
  if (error) {
    await supabase.storage.from("public-media").remove([path]);
    return { ok: false, message: dbErrorMessage(error) };
  }
  revalidatePath("/admin/medios");
  return { ok: true, message: "Imagen subida." };
}

export async function updateMedia(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const id = z.uuid().safeParse(fd.get("id"));
  const meta = metaSchema.safeParse(Object.fromEntries(fd));
  if (!id.success || !meta.success) return { ok: false, message: meta.success ? "Inválido." : firstIssue(meta.error) };
  const { error } = await supabase.from("media_assets").update(meta.data).eq("id", id.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath("/admin/medios");
  return { ok: true, message: "Guardado. Vuelve a publicar los contenidos que usan esta imagen para reflejar el cambio." };
}

export async function deleteMedia(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Inválido." };
  const { data } = await supabase.from("media_assets").select("path").eq("id", id.data).maybeSingle();
  // Si está en uso por contenido publicado, el snapshot conserva la ruta: se impide borrarla.
  const { data: published } = await supabase.from("published_content").select("data");
  const inUse = data?.path && (published ?? []).some((p) => JSON.stringify(p.data).includes(data.path));
  if (inUse) return { ok: false, message: "La imagen está en uso en contenido publicado. Retírala del contenido y vuelve a publicar." };
  const { error } = await supabase.from("media_assets").delete().eq("id", id.data);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (data?.path) await supabase.storage.from("public-media").remove([data.path]);
  revalidatePath("/admin/medios");
  return { ok: true, message: "Imagen eliminada." };
}
