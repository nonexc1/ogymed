"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";

import { complaintSchema, type ComplaintInput, type ComplaintOutput } from "./schema";

export function ComplaintForm({ providerLine }: { providerLine: string }) {
  const [receipt, setReceipt] = useState<{ code: string; created_at: string } | null>(null);
  const [error, setError] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintInput, unknown, ComplaintOutput>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { kind: "reclamo", document_type: "DNI", is_minor: false, website: "" },
  });
  const isMinor = useWatch({ control, name: "is_minor" });

  const onSubmit = handleSubmit(async (values) => {
    setError(false);
    const res = await fetch("/api/complaints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.ok && body?.ok) setReceipt({ code: body.code, created_at: body.created_at });
    else setError(true);
  });

  if (receipt) {
    return (
      <Card className="space-y-3" role="status">
        <h2 className="text-2xl">Constancia de registro</h2>
        <p>
          Código: <strong className="font-mono">{receipt.code}</strong>
        </p>
        <p>Fecha: {new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(receipt.created_at))}</p>
        <p className="text-muted">{providerLine}</p>
        <p className="text-muted">Guarda este código. Puedes imprimir esta página como constancia.</p>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimir constancia
        </Button>
      </Card>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <Alert tone="danger" role="alert">
          No pudimos registrar tu reclamo. Inténtalo nuevamente o comunícate con la clínica.
        </Alert>
      ) : null}
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-2xl text-plum-strong">1. Identificación de la persona consumidora</legend>
        <Field id="lr-name" label="Nombre completo" required error={errors.consumer_name?.message}>
          {(a) => <Input {...a} autoComplete="name" {...register("consumer_name")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lr-doctype" label="Tipo de documento" required>
            {(a) => (
              <Select {...a} {...register("document_type")}>
                <option value="DNI">DNI</option>
                <option value="CE">Carné de extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="OTRO">Otro</option>
              </Select>
            )}
          </Field>
          <Field id="lr-doc" label="Número de documento" required error={errors.document_number?.message}>
            {(a) => <Input {...a} {...register("document_number")} />}
          </Field>
        </div>
        <Field id="lr-address" label="Domicilio" error={errors.address?.message}>
          {(a) => <Input {...a} autoComplete="street-address" {...register("address")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lr-email" label="Correo electrónico" required error={errors.email?.message}>
            {(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}
          </Field>
          <Field id="lr-phone" label="Teléfono" error={errors.phone_e164?.message}>
            {(a) => <Input {...a} type="tel" autoComplete="tel" {...register("phone_e164")} />}
          </Field>
        </div>
        <Checkbox id="lr-minor" label="La persona consumidora es menor de edad" {...register("is_minor")} />
        {isMinor ? (
          <Field id="lr-guardian" label="Nombre del padre, madre o apoderado" required error={errors.guardian_name?.message}>
            {(a) => <Input {...a} {...register("guardian_name")} />}
          </Field>
        ) : null}
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-2xl text-plum-strong">2. Identificación del servicio</legend>
        <Field id="lr-service" label="Servicio contratado" required error={errors.service_description?.message}>
          {(a) => <Input {...a} {...register("service_description")} />}
        </Field>
        <Field id="lr-amount" label="Monto reclamado (S/)" error={errors.amount_pen?.message}>
          {(a) => <Input {...a} inputMode="decimal" {...register("amount_pen")} />}
        </Field>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-2xl text-plum-strong">3. Detalle</legend>
        <Field id="lr-kind" label="Tipo" required description="Reclamo: disconformidad con el servicio. Queja: malestar respecto de la atención (definiciones pendientes de validación legal).">
          {(a) => (
            <Select {...a} {...register("kind")}>
              <option value="reclamo">Reclamo</option>
              <option value="queja">Queja</option>
            </Select>
          )}
        </Field>
        <Field id="lr-detail" label="Detalle" required error={errors.detail?.message} description="No es necesario incluir información médica.">
          {(a) => <Textarea {...a} maxLength={3000} {...register("detail")} />}
        </Field>
        <Field id="lr-request" label="Pedido" required error={errors.consumer_request?.message}>
          {(a) => <Textarea {...a} maxLength={1500} {...register("consumer_request")} />}
        </Field>
      </fieldset>
      <div aria-hidden="true" className="hidden">
        <label htmlFor="lr-website">No completar</label>
        <input id="lr-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Checkbox
        id="lr-privacy"
        error={errors.privacy?.message}
        label={
          <>
            Autorizo el tratamiento de mis datos para atender este registro, según la{" "}
            <a href="/privacidad" target="_blank" rel="noopener" className="text-plum underline underline-offset-4">
              política de privacidad
            </a>
            .
          </>
        }
        {...register("privacy")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registrando…" : "Registrar"}
      </Button>
    </form>
  );
}
