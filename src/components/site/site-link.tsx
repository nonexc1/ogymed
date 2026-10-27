import Link from "next/link";
import type { ComponentProps } from "react";

import { isAnalyticsAllowedPath } from "@/lib/analytics/policy";

/**
 * Enlace interno: navegación cliente sólo entre rutas donde la analítica está permitida.
 * Hacia cualquier otra ruta se usa <a> (recarga completa) para que ningún script de analítica
 * cargado previamente siga vivo en páginas sensibles.
 */
export function SiteLink({ href, ...props }: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  if (href.startsWith("/") && isAnalyticsAllowedPath(href)) {
    return <Link href={href} {...props} />;
  }
  return <a href={href} {...props} />;
}
