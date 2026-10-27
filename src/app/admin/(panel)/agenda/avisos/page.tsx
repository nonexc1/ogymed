import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/admin/action-form";
import { OUTBOX_STATUS, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/surface";
import { requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

import { retryNotification } from "../actions";

export const metadata: Metadata = { title: "Avisos" };

export default async function NotificationsPage() {
  const { supabase } = await requireStaff(["admin", "reception"]);
  const { data } = await supabase
    .from("notification_outbox")
    .select("id, kind, recipient, status, attempts, max_attempts, last_error, scheduled_at, appointment_id, updated_at")
    .in("status", ["failed", "pending", "sending"])
    .order("updated_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Avisos pendientes y fallidos" description="Un fallo de correo nunca anula una cita: aquí se ven los avisos que no salieron y se pueden reintentar." />
      <Panel>
        {(data ?? []).length ? (
          <Table>
            <thead>
              <tr><th scope="col">Tipo</th><th scope="col">Estado</th><th scope="col">Intentos</th><th scope="col">Último error</th><th scope="col">Programado</th><th scope="col">Cita</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((o) => (
                <tr key={o.id}>
                  <td>{o.kind}</td>
                  <td><Badge tone={o.status === "failed" ? "danger" : "neutral"}>{OUTBOX_STATUS[o.status] ?? o.status}</Badge></td>
                  <td>{o.attempts}/{o.max_attempts}</td>
                  <td className="text-muted">{o.last_error ?? "—"}</td>
                  <td>{formatLimaDateTime(o.scheduled_at)}</td>
                  <td>{o.appointment_id ? <Link href={`/admin/citas/${o.appointment_id}`} className="text-plum underline">Ver</Link> : "—"}</td>
                  <td>
                    {o.status === "failed" ? (
                      <ActionForm action={retryNotification} submitLabel="Reintentar" submitVariant="secondary" inline>
                        <input type="hidden" name="id" value={o.id} />
                      </ActionForm>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-muted">No hay avisos pendientes ni fallidos.</p>
        )}
      </Panel>
    </>
  );
}
