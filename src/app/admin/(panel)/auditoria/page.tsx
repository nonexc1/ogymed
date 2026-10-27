import type { Metadata } from "next";

import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "Auditoría" };

export default async function AuditPage() {
  const { supabase } = await requireStaff(["admin"]);
  const { data } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(300);
  const { data: staff } = await supabase.rpc("admin_list_staff");
  const names = new Map(((staff ?? []) as { user_id: string; display_name: string }[]).map((s) => [s.user_id, s.display_name]));
  return (
    <>
      <PageHeader title="Auditoría" description="Registro de sólo inserción (no se puede editar ni borrar). Contiene IDs técnicos, no datos sensibles completos." />
      <Panel>
        <Table>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Actor</th><th scope="col">Acción</th><th scope="col">Entidad</th><th scope="col">Detalle</th></tr></thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{formatLimaDateTime(e.at)}</td>
                <td>{e.actor_user_id ? names.get(e.actor_user_id) ?? e.actor_user_id.slice(0, 8) : e.actor_kind}</td>
                <td className="font-mono text-xs">{e.action}</td>
                <td className="font-mono text-xs">{e.entity_type}{e.entity_id ? `:${e.entity_id.slice(0, 8)}` : ""}</td>
                <td className="font-mono text-xs text-muted">{JSON.stringify(e.details)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
