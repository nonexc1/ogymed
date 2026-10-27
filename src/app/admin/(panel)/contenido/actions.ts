"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/components/admin/action-form";
import { firstIssue, optText, optUuid, reqText, slugSchema } from "@/features/cms/admin/form-helpers";
import { CONTENT_TAG, SETTINGS_TAG } from "@/features/cms/queries";
import { homeSectionsSchema } from "@/features/cms/types";
import { dbErrorMessage } from "@/lib/auth/errors";
import { requireStaff } from "@/lib/auth/staff";

import { PAGE_KINDS } from "./page-kinds";

const bad = (message: string): ActionResult => ({ ok: false, message });


/** Fuerza que la web pública relea lo publicado (p. ej. tras cargar contenido directamente en la base). */
export async function refreshPublicSite(): Promise<ActionResult> {
  await requireStaff(["admin", "editor"]);
  updateTag(CONTENT_TAG);
  updateTag(SETTINGS_TAG);
  return { ok: true, message: "Listo: la web pública mostrará lo publicado en la próxima visita." };
}

export async function createPage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const kind = z.enum(Object.keys(PAGE_KINDS) as [string, ...string[]]).safeParse(fd.get("kind"));
  if (!kind.success) return bad("Tipo de página inválido.");
  const meta = PAGE_KINDS[kind.data]!;
  const { data, error } = await supabase
    .from("pages")
    .insert({ kind: kind.data, title: meta.title, requires_medical_review: meta.review })
    .select("id")
    .single();
  if (error) return bad(dbErrorMessage(error));
  redirect(`/admin/contenido/paginas/${data.id}`);
}

/** «Título | Texto» por línea → highlights de portada. */
const parseHighlights = (text: string) =>
  text
    .split("\n")
    .map((l) => l.split("|").map((p) => p.trim()))
    .filter(([t, x]) => t && x)
    .map(([title, text]) => ({ title: title!, text: text! }));

export async function savePage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z
    .object({
      id: z.uuid(),
      kind: z.string(),
      title: reqText(2, 120, "Título"),
      intro: z.string().trim().max(600).default(""),
      body_md: z.string().max(40000).default(""),
      seo_title: optText(70),
      seo_description: optText(170),
      og_media_id: optUuid,
      document_version: optText(40),
      hero_kicker: z.string().trim().max(80).optional(),
      hero_title: z.string().trim().max(140).optional(),
      hero_text: z.string().trim().max(400).optional(),
      facilities_text: z.string().trim().max(800).optional(),
      highlights: z.string().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { id, kind, hero_kicker, hero_title, hero_text, facilities_text, highlights, ...rest } = parsed.data;
  const update: Record<string, unknown> = rest;
  if (kind === "home") {
    const sections = homeSectionsSchema.safeParse({
      hero_kicker: hero_kicker || undefined,
      hero_title: hero_title || undefined,
      hero_text: hero_text || undefined,
      facilities_text: facilities_text || undefined,
      highlights: highlights ? parseHighlights(highlights) : undefined,
    });
    if (!sections.success) return bad("Revisa las secciones de portada (máximo 4 destacados).");
    update.sections = sections.data;
  }
  const { error } = await supabase.from("pages").update(update).eq("id", id);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/contenido/paginas/${id}`);
  return { ok: true, message: "Guardado como borrador. Publica para actualizar la web." };
}

const faqSchema = z.object({
  question: reqText(5, 200, "Pregunta"),
  answer_md: reqText(2, 4000, "Respuesta"),
  category: z.enum(["general", "reservas", "visita", "pagos", "ubicacion"]),
  sort_order: z.coerce.number().int().min(0).max(10000).default(100),
});

export async function createFaq(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = faqSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { error } = await supabase.from("faqs").insert(parsed.data);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath("/admin/contenido/faqs");
  return { ok: true, message: "Pregunta creada como borrador." };
}

export async function saveFaq(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const id = z.uuid().safeParse(fd.get("id"));
  const parsed = faqSchema.safeParse(Object.fromEntries(fd));
  if (!id.success || !parsed.success) return bad(parsed.success ? "Inválido." : firstIssue(parsed.error));
  const { error } = await supabase.from("faqs").update(parsed.data).eq("id", id.data);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath("/admin/contenido/faqs");
  return { ok: true, message: "Guardado como borrador." };
}

export async function createPost(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z.object({ title: reqText(5, 140, "Título"), slug: slugSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { data, error } = await supabase.from("posts").insert({ ...parsed.data, author_name: "Equipo OGYMED" }).select("id").single();
  if (error) return bad(dbErrorMessage(error));
  redirect(`/admin/contenido/blog/${data.id}`);
}

/** «Título | URL | Editorial | Año» por línea. */
function parseReferences(text: string) {
  return text
    .split("\n")
    .map((l) => l.split("|").map((p) => p.trim()))
    .filter(([title]) => title)
    .map(([title, url, publisher, year]) => ({
      title: title!,
      ...(url && /^https?:\/\//.test(url) ? { url } : {}),
      ...(publisher ? { publisher } : {}),
      ...(year && /^\d{4}$/.test(year) ? { year: Number(year) } : {}),
    }));
}

export async function savePost(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const parsed = z
    .object({
      id: z.uuid(),
      title: reqText(5, 140, "Título"),
      slug: slugSchema,
      excerpt: z.string().trim().max(400).default(""),
      body_md: z.string().max(60000).default(""),
      cover_media_id: optUuid,
      og_media_id: optUuid,
      author_doctor_id: optUuid,
      author_name: optText(120),
      reviewer_doctor_id: optUuid,
      references: z.string().max(10000).default(""),
      seo_title: optText(70),
      seo_description: optText(170),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { id, references, ...rest } = parsed.data;
  if (!rest.author_doctor_id && !rest.author_name) return bad("Indica un autor (profesional o nombre).");
  const related = fd.getAll("related_service_ids").map(String).filter((v) => z.uuid().safeParse(v).success);
  const { error } = await supabase
    .from("posts")
    .update({ ...rest, references_list: parseReferences(references), related_service_ids: related })
    .eq("id", id);
  if (error) return bad(dbErrorMessage(error));
  revalidatePath(`/admin/contenido/blog/${id}`);
  return { ok: true, message: "Guardado como borrador." };
}
