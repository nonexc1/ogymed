/** Marca tipográfica PROVISIONAL hasta recibir el logo oficial de OGYMED. */
export function Logo({ name = "OGYMED" }: { name?: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-display text-2xl font-semibold tracking-[0.08em] text-plum-strong">{name}</span>
      <span className="hidden text-sm font-medium text-sage-strong sm:inline">Ginecología · Surco</span>
    </span>
  );
}
