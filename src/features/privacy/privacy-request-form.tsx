"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";

import { privacyRequestSchema, type PrivacyRequestInput, type PrivacyRequestOutput } from "./schema";

export function PrivacyRequestForm() {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PrivacyRequestInput, unknown, PrivacyRequestOutput>({
    resolver: zodResolver(privacyRequestSchema),
    defaultValues: { kind: "acceso", detail: "", website: "" },
  });
  const onSubmit = handleSubmit(async (values) => {
    const res = await fetch("/api/privacy-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  });
  if (state === "sent") {
    return <Alert tone="success" role="status" title="Solicitud registrada">Te contactaremos por correo. Podemos pedirte acreditar tu identidad antes de atenderla.</Alert>;
  }
  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {state === "error" ? <Alert tone="danger" role="alert">No pudimos registrar la solicitud. Inténtalo de nuevo.</Alert> : null}
      <Field id="pr-kind" label="Tipo de solicitud" required>
        {(a) => (
          <Select {...a} {...register("kind")}>
            <option value="acceso">Acceso a mis datos</option>
            <option value="rectificacion">Rectificación</option>
            <option value="cancelacion">Cancelación / supresión</option>
            <option value="oposicion">Oposición</option>
            <option value="revocacion">Revocación de consentimiento</option>
            <option value="otro">Otro</option>
          </Select>
        )}
      </Field>
      <Field id="pr-name" label="Nombre completo" required error={errors.requester_name?.message}>{(a) => <Input {...a} autoComplete="name" {...register("requester_name")} />}</Field>
      <Field id="pr-email" label="Correo" required error={errors.email?.message}>{(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}</Field>
      <Field id="pr-detail" label="Detalle (opcional)" description="No incluyas información médica.">{(a) => <Textarea {...a} maxLength={2000} {...register("detail")} />}</Field>
      <div aria-hidden="true" className="hidden"><input tabIndex={-1} autoComplete="off" {...register("website")} /></div>
      <Button type="submit" disabled={isSubmitting}>Enviar solicitud</Button>
    </form>
  );
}
