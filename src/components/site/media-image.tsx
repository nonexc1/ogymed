import Image from "next/image";

import { mediaUrl, skipImageOptimization } from "@/features/cms/media";
import type { Media } from "@/features/cms/types";

/** Imagen de Storage con dimensiones explícitas (evita CLS) y formatos AVIF/WebP vía next/image. */
export function MediaImage({
  media,
  sizes,
  priority = false,
  className,
}: {
  media: NonNullable<Media>;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={mediaUrl(media)}
      alt={media.alt}
      width={media.width ?? 1200}
      height={media.height ?? 800}
      sizes={sizes}
      priority={priority}
      unoptimized={skipImageOptimization}
      className={className}
    />
  );
}
