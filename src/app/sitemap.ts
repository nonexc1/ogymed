import type { MetadataRoute } from "next";

import { listPublishedPaths } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";
import { indexingEnabled } from "@/lib/env.server";

export const revalidate = 3600;

/** Sólo páginas publicadas e indexables. Nunca admin, reservas, gestión, previews ni borradores. */
const EXCLUDED = new Set(["/libro-de-reclamaciones"]);
const INDEX_TYPES: Record<string, string> = { "/servicios": "service", "/equipo": "doctor", "/blog": "post" };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingEnabled) return [];
  const paths = await listPublishedPaths();
  const types = new Set(paths.map((p) => p.type));
  const entries = new Map<string, Date>([["/", new Date()]]);
  for (const p of paths) {
    if (EXCLUDED.has(p.path)) continue;
    // Un índice sin elementos publicados no se ofrece a buscadores (no se publican páginas vacías).
    const listed = INDEX_TYPES[p.path];
    if (listed && !types.has(listed)) continue;
    entries.set(p.path, new Date(p.updatedAt));
  }
  // Índices con contenido aunque su página editorial no esté publicada.
  if (types.has("service")) entries.set("/servicios", entries.get("/servicios") ?? new Date());
  if (types.has("doctor")) entries.set("/equipo", entries.get("/equipo") ?? new Date());
  if (types.has("post")) entries.set("/blog", entries.get("/blog") ?? new Date());
  entries.set("/contacto", entries.get("/contacto") ?? new Date());
  return [...entries].map(([path, lastModified]) => ({ url: `${siteUrl}${path}`, lastModified }));
}
