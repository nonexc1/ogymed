import { deployEnv } from "@/lib/env";

/** Aviso visible sólo fuera de producción: qué datos reales faltan (nunca se muestra en producción). */
export function DevNotice({ missing }: { missing: string[] }) {
  if (deployEnv === "production" || missing.length === 0) return null;
  return (
    <aside className="border-b border-warning/30 bg-warning-soft px-5 py-2 text-center text-sm text-warning" aria-label="Aviso de entorno de desarrollo">
      Entorno de {deployEnv === "preview" ? "previsualización" : "desarrollo"} · Datos pendientes: {missing.join(", ")} · Ver docs/DATOS_PENDIENTES.md
    </aside>
  );
}
