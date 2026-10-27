import type { Metadata } from "next";
import Link from "next/link";

import { ContentStatus, DemoBadge, PageHeader, Panel, Table } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/surface";
import { doctorLabel } from "@/features/admin/data";
import { hasRole, requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Profesionales" };

export default async function DoctorsAdminPage() {
  const { supabase, staff } = await requireStaff(["admin", "editor"]);
  const [{ data }, { data: live }] = await Promise.all([
    supabase.from("doctors").select("id, full_name, honorific, slug, specialty, status, active, credentials_verified, is_demo").order("sort_order").order("full_name"),
    supabase.from("published_content").select("entity_id").eq("entity_type", "doctor"),
  ]);
  const liveIds = new Set((live ?? []).map((l) => l.entity_id));
  return (
    <>
      <PageHeader
        title="Profesionales"
        description="Perfiles públicos (con CMP/RNE verificados por administración) y configuración de agenda."
        actions={hasRole(staff, "admin", "editor") ? <Link href="/admin/profesionales/nuevo" className={buttonVariants({ size: "sm" })}>Nuevo profesional</Link> : null}
      />
      <Panel>
        <Table>
          <thead>
            <tr><th scope="col">Profesional</th><th scope="col">Perfil</th><th scope="col">Credenciales</th><th scope="col">Agenda</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/admin/profesionales/${d.id}`} className="font-semibold text-plum underline-offset-4 hover:underline">{doctorLabel(d)}</Link>{" "}
                  <DemoBadge demo={d.is_demo} />
                  <span className="block text-xs text-muted">{d.specialty ?? "—"}</span>
                </td>
                <td><ContentStatus status={d.status} live={liveIds.has(d.id)} /></td>
                <td>{d.credentials_verified ? <Badge tone="success">Verificadas</Badge> : <Badge tone="warning">Sin verificar</Badge>}</td>
                <td>{d.active ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
