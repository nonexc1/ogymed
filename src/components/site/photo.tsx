import { Camera } from "lucide-react";
import Image from "next/image";

import { mediaUrl, skipImageOptimization } from "@/features/cms/media";
import type { Media } from "@/features/cms/types";
import { cn } from "@/lib/utils";

/**
 * Origen de una fotografía editorial:
 * - media: imagen real subida en Medios (derechos confirmados y texto alternativo obligatorios);
 * - pending: hueco rotulado «Fotografía pendiente». SÓLO para la vista de demostración privada:
 *   la web pública nunca muestra marcadores (si no hay foto, la sección usa su variante sin foto).
 */
export type PhotoSource = { kind: "media"; media: NonNullable<Media> } | { kind: "pending"; label: string };

export const photoFrom = (media: Media | undefined): PhotoSource | null => (media ? { kind: "media", media } : null);

/** Caja con proporción fija (className define aspecto y bordes) y la imagen recortada con object-cover. */
export function Photo({
  source,
  sizes,
  priority = false,
  className,
  pendingClassName,
}: {
  source: PhotoSource;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Ajusta la posición del rótulo «Fotografía pendiente» (p. ej. si un texto se superpone). */
  pendingClassName?: string;
}) {
  if (source.kind === "pending") {
    // El contenido va en una capa absoluta: las clases de visibilidad (hidden/lg:block) del contenedor no lo descolocan.
    return (
      <div role="img" aria-label={`Fotografía pendiente: ${source.label}`} className={cn("relative overflow-hidden bg-rose/45", className)}>
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(81_40_63/0.05)_14px_15px)] p-6 text-center text-plum",
            pendingClassName,
          )}
        >
          <Camera aria-hidden="true" className="size-8" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Fotografía pendiente</span>
          <span className="max-w-[18rem] text-sm text-plum-strong">{source.label}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-sand", className)}>
      <Image
        src={mediaUrl(source.media)}
        alt={source.media.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={skipImageOptimization}
        className="object-cover"
      />
    </div>
  );
}
