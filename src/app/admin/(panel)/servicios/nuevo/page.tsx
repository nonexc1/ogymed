import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth/staff";

import { createService } from "../actions";

export const metadata: Metadata = { title: "Nuevo servicio" };

export default async function NewServicePage() {
  await requireStaff(["admin", "editor"]);
  return (
    <>
      <PageHeader title="Nuevo servicio" description="Se crea como borrador e inactivo en la agenda." />
      <Panel>
        <ActionForm action={createService} submitLabel="Crear borrador">
          <Field id="name" label="Nombre" required>{(a) => <Input {...a} name="name" />}</Field>
          <Field id="slug" label="Slug (URL)" required description="Ej. consulta-ginecologica → /servicios/consulta-ginecologica">{(a) => <Input {...a} name="slug" />}</Field>
        </ActionForm>
      </Panel>
    </>
  );
}
