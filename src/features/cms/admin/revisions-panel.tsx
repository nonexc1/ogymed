import type { SupabaseClient } from "@supabase/supabase-js";

import { ActionForm } from "@/components/admin/action-form";
import { Panel } from "@/components/admin/ui";
import { formatLimaDateTime } from "@/lib/datetime";

import { restoreRevision } from "./actions";

export async function RevisionsPanel({ db, entity, id, back, canRestore }: { db: SupabaseClient; entity: string; id: string; back: string; canRestore: boolean }) {
  const { data } = await db
    .from("content_revisions")
    .select("id, reason, created_at")
    .eq("entity_type", entity)
    .eq("entity_id", id)
    .order("id", { ascending: false })
    .limit(15);
  return (
    <Panel title="Historial">
      {(data ?? []).length ? (
        <ul className="space-y-2 text-sm">
          {(data ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {formatLimaDateTime(r.created_at)} · {r.reason === "publish" ? "Publicación" : r.reason === "update" ? "Versión anterior a una edición" : "Restauración"}
              </span>
              {canRestore && r.reason === "update" ? (
                <ActionForm action={restoreRevision} submitLabel="Restaurar" submitVariant="ghost" inline>
                  <input type="hidden" name="revision" value={r.id} />
                  <input type="hidden" name="back" value={back} />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sin cambios registrados.</p>
      )}
    </Panel>
  );
}
