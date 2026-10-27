import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { indexingEnabled } from "@/lib/env.server";

/** robots.txt no es seguridad: lo privado está protegido por autenticación. */
export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/reservar", "/cita/", "/api/", "/libro-de-reclamaciones"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
