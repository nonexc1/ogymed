import "server-only";

import type { Metadata } from "next";

import { mediaUrl } from "@/features/cms/media";
import type { Media } from "@/features/cms/types";
import { siteUrl } from "@/lib/env";
import { indexingEnabled } from "@/lib/env.server";

export const absoluteUrl = (path: string) => `${siteUrl}${path}`;

/**
 * Metadata por página: canonical absoluto al dominio configurado, OG/Twitter y robots.
 * Fuera de producción (o sin SITE_INDEXING=on) todo es noindex.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
  type = "website",
}: {
  title: string;
  description?: string | null;
  path: string;
  image?: Media;
  noindex?: boolean;
  type?: "website" | "article" | "profile";
}): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: mediaUrl(image), width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined;
  return {
    title,
    description: description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description ?? undefined,
      url,
      siteName: "OGYMED",
      locale: "es_PE",
      type,
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description: description ?? undefined, images: images?.map((i) => i.url) },
    robots: noindex || !indexingEnabled ? { index: false, follow: !noindex } : { index: true, follow: true },
  };
}

/** Rutas privadas: nunca indexables, ni siguen enlaces. */
export const privateMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
});
