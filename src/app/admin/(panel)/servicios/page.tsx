import type { Metadata } from "next";
import Link from "next/link";

import { ContentStatus, DemoBadge, PageHeader, Panel, Table } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/surface";
import { hasRole, requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesAdminPage() {
  const { supabase, staff } = await requireStaff(["admin", "editor", "professional"]);
  const [{ data }, { data: live }] = await Promise.all([
    supabase.from("services").select("id, name, slug, status, active, online_booking_enabled, is_demo, updated_at").order("sort_order").order("name"),
    supabase.from("published_content").select("entity_id").eq("entity_type", "service"),
  ]);
  const liveIds = new Set((live ?? []).map((l) => l.entity_id));
  return (
    <>
      <PageHeader
        title="Servicios"
        description="Sólo servicios realmente ofrecidos por OGYMED. Cada ficha se publica tras revisión médica."
        actions={hasRole(staff, "admin", "editor") ? <Link href="/admin/servicios/nuevo" className={buttonVariants({ size: "sm" })}>Nuevo servicio</Link> : null}
      />
      <Panel>
        <Table>
          <thead>
            <tr><th scope="col">Servicio</th><th scope="col">Estado</th><th scope="col">Agenda</th><th scope="col">Reserva web</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/admin/servicios/${s.id}`} className="font-semibold text-plum underline-offset-4 hover:underline">{s.name}</Link>{" "}
                  <DemoBadge demo={s.is_demo} />
                  <span className="block text-xs text-muted">/servicios/{s.slug}</span>
                </td>
                <td><ContentStatus status={s.status} live={liveIds.has(s.id)} /></td>
                <td>{s.active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                <td>{s.online_booking_enabled ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
