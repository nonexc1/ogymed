import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth/staff";

import { createDoctor } from "../actions";

export const metadata: Metadata = { title: "Nuevo profesional" };

export default async function NewDoctorPage() {
  await requireStaff(["admin", "editor"]);
  return (
    <>
      <PageHeader title="Nuevo profesional" description="Se crea como borrador e inactivo en la agenda." />
      <Panel>
        <ActionForm action={createDoctor} submitLabel="Crear borrador">
          <Field id="full_name" label="Nombre completo" required>{(a) => <Input {...a} name="full_name" />}</Field>
          <Field id="slug" label="Slug (URL)" required description="Ej. nombre-apellido → /equipo/nombre-apellido">{(a) => <Input {...a} name="slug" />}</Field>
        </ActionForm>
      </Panel>
    </>
  );
}
