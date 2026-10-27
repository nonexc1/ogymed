import "server-only";

import { unstable_cache } from "next/cache";

import { hideDemoContent } from "@/lib/env";
import { getPublicClient } from "@/lib/supabase/public";

import {
  doctorSchema,
  EMPTY_SETTINGS,
  faqSchema,
  pageSchema,
  postSchema,
  publicSettingsSchema,
  serviceSchema,
  type Doctor,
  type Faq,
  type Page,
  type Post,
  type PublicSettings,
  type Service,
} from "./types";

export const CONTENT_TAG = "content";
export const SETTINGS_TAG = "settings";
const REVALIDATE_SECONDS = 3600;

type Row = {
  entity_id: string;
  entity_type: string;
  path: string | null;
  data: unknown;
  sort_order: number;
  is_demo: boolean;
  first_published_at: string;
  updated_at: string;
};

const fetchPublished = unstable_cache(
  async (): Promise<Row[]> => {
    const db = getPublicClient();
    if (!db) return [];
    let query = db
      .from("published_content")
      .select("entity_id, entity_type, path, data, sort_order, is_demo, first_published_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("first_published_at", { ascending: true });
    if (hideDemoContent) query = query.eq("is_demo", false);
    const { data, error } = await query;
    if (error) {
      console.error("content_fetch_error", { code: error.code });
      throw new Error("No se pudo leer el contenido publicado");
    }
    return (data ?? []) as Row[];
  },
  // El filtro de demo forma parte de la clave: nunca reutilizar en producción una caché con datos demo.
  ["published-content-v1", hideDemoContent ? "sin-demo" : "con-demo"],
  { tags: [CONTENT_TAG], revalidate: REVALIDATE_SECONDS },
);

async function publishedOf(type: string): Promise<Row[]> {
  try {
    return (await fetchPublished()).filter((r) => r.entity_type === type);
  } catch {
    return [];
  }
}

function parseRows<T>(rows: Row[], parse: (row: Row) => T | null): T[] {
  return rows.map(parse).filter((x): x is T => x !== null);
}

export async function listServices(): Promise<Service[]> {
  return parseRows(await publishedOf("service"), (r) => {
    const p = serviceSchema.safeParse(r.data);
    return p.success ? { ...p.data, id: r.entity_id, path: r.path!, updatedAt: r.updated_at } : null;
  });
}

export async function getService(slug: string) {
  return (await listServices()).find((s) => s.slug === slug) ?? null;
}

export async function listDoctors(): Promise<Doctor[]> {
  return parseRows(await publishedOf("doctor"), (r) => {
    const p = doctorSchema.safeParse(r.data);
    return p.success ? { ...p.data, id: r.entity_id, path: r.path!, updatedAt: r.updated_at } : null;
  });
}

export async function getDoctor(slug: string) {
  return (await listDoctors()).find((d) => d.slug === slug) ?? null;
}

export async function listPosts(): Promise<Post[]> {
  const posts = parseRows(await publishedOf("post"), (r) => {
    const p = postSchema.safeParse(r.data);
    return p.success
      ? { ...p.data, id: r.entity_id, path: r.path!, publishedAt: r.first_published_at, updatedAt: r.updated_at }
      : null;
  });
  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPost(slug: string) {
  return (await listPosts()).find((p) => p.slug === slug) ?? null;
}

export async function getPage(kind: string): Promise<Page | null> {
  const row = (await publishedOf("page")).find((r) => (r.data as { kind?: string })?.kind === kind);
  if (!row) return null;
  const p = pageSchema.safeParse(row.data);
  return p.success ? { ...p.data, id: row.entity_id, path: row.path!, updatedAt: row.updated_at } : null;
}

export async function listFaqs(): Promise<Faq[]> {
  return parseRows(await publishedOf("faq"), (r) => {
    const p = faqSchema.safeParse(r.data);
    return p.success ? { ...p.data, id: r.entity_id } : null;
  });
}

export async function listPublishedPaths() {
  const rows = await fetchPublished().catch(() => [] as Row[]);
  return rows
    .filter((r) => r.path)
    .map((r) => ({ path: r.path!, updatedAt: r.updated_at, type: r.entity_type }));
}

const fetchOfferings = unstable_cache(
  async () => {
    const db = getPublicClient();
    if (!db) return [] as { doctor_id: string; service_id: string; online_booking: boolean }[];
    const { data, error } = await db.rpc("public_offerings");
    if (error) {
      console.error("offerings_fetch_error", { code: error.code });
      return [];
    }
    return (data ?? []) as { doctor_id: string; service_id: string; online_booking: boolean }[];
  },
  ["public-offerings-v1"],
  { tags: [CONTENT_TAG], revalidate: 600 },
);

export async function getOfferings() {
  return fetchOfferings();
}

export async function doctorsForService(serviceId: string) {
  const [offerings, doctors] = await Promise.all([getOfferings(), listDoctors()]);
  const ids = new Set(offerings.filter((o) => o.service_id === serviceId).map((o) => o.doctor_id));
  return doctors.filter((d) => ids.has(d.id));
}

export async function servicesForDoctor(doctorId: string) {
  const [offerings, services] = await Promise.all([getOfferings(), listServices()]);
  const ids = new Set(offerings.filter((o) => o.doctor_id === doctorId).map((o) => o.service_id));
  return services.filter((s) => ids.has(s.id));
}

const fetchSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    const db = getPublicClient();
    if (!db) return EMPTY_SETTINGS;
    const { data, error } = await db.from("clinic_settings_public").select("*").maybeSingle();
    if (error || !data) {
      if (error) console.error("settings_fetch_error", { code: error.code });
      return EMPTY_SETTINGS;
    }
    const parsed = publicSettingsSchema.safeParse(data);
    return parsed.success ? parsed.data : EMPTY_SETTINGS;
  },
  ["public-settings-v1"],
  { tags: [SETTINGS_TAG], revalidate: REVALIDATE_SECONDS },
);

export async function getSettings(): Promise<PublicSettings> {
  return fetchSettings();
}

const fetchRedirects = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const db = getPublicClient();
    if (!db) return {};
    const { data } = await db.from("redirects").select("from_path, to_path");
    return Object.fromEntries((data ?? []).map((r) => [r.from_path as string, r.to_path as string]));
  },
  ["redirects-v1"],
  { tags: [CONTENT_TAG], revalidate: 300 },
);

export async function findRedirect(path: string): Promise<string | null> {
  return (await fetchRedirects())[path] ?? null;
}

/** Versión vigente de la política de privacidad publicada (se registra en cada consentimiento). */
export async function getPrivacyVersion(): Promise<string | null> {
  return (await getPage("privacy"))?.document_version ?? null;
}
