import { cn } from "@/lib/utils";

/**
 * Marca tipográfica (palabra «OGYMED» en la serif de títulos). El logo circular recibido queda pendiente
 * de versión vectorial y de decidir su uso con la paleta ciruela (ver docs/ASSETS.md).
 */
export function Logo({ name = "OGYMED", descriptor = false, className }: { name?: string; descriptor?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="font-display text-[1.85rem] font-normal tracking-[0.01em] text-plum-strong sm:text-[2.1rem]">{name}</span>
      {descriptor ? <span className="mt-1.5 text-sm font-medium text-sage-strong">Ginecología · Santiago de Surco</span> : null}
    </span>
  );
}
