import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/surface";
import { requireStaff } from "@/lib/auth/staff";
import { formatLimaDateTime } from "@/lib/datetime";

import { createRedirect, deleteRedirect } from "./actions";

export const metadata: Metadata = { title: "Redirecciones" };

export default async function RedirectsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Redirecciones 301" description="Se crean solas al cambiar el slug de algo publicado. La base impide bucles y aplana cadenas." />
      <Panel title="Nueva redirección manual" className="mb-6">
        <ActionForm action={createRedirect} submitLabel="Crear">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="from_path" label="Desde">{(a) => <Input {...a} name="from_path" placeholder="/servicios/nombre-anterior" />}</Field>
            <Field id="to_path" label="Hacia">{(a) => <Input {...a} name="to_path" placeholder="/servicios/nombre-nuevo" />}</Field>
          </div>
        </ActionForm>
      </Panel>
      <Panel>
        <Table>
          <thead><tr><th scope="col">Desde</th><th scope="col">Hacia</th><th scope="col">Origen</th><th scope="col">Fecha</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.from_path}</td>
                <td className="font-mono text-xs">{r.to_path}</td>
                <td><Badge>{r.source === "auto" ? "Automática" : "Manual"}</Badge></td>
                <td>{formatLimaDateTime(r.created_at)}</td>
                <td>
                  <ActionForm action={deleteRedirect} submitLabel="Eliminar" submitVariant="ghost" inline>
                    <input type="hidden" name="id" value={r.id} />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
