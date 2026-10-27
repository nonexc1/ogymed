"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";

import { contactSchema, type ContactInput, type ContactOutput } from "./schema";

export function ContactForm({ defaultTopic = "informacion" }: { defaultTopic?: "cita" | "informacion" | "otro" }) {
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "limited">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactInput, unknown, ContactOutput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { topic: defaultTopic, message: "", website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("idle");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("sent");
      reset({ topic: defaultTopic, message: "", website: "" });
    } else {
      setStatus(res?.status === 429 ? "limited" : "error");
    }
  });

  if (status === "sent") {
    return (
      <Alert tone="success" role="status" title="Mensaje recibido">
        Recepción te contactará por el medio que indicaste. Si tu consulta es urgente, llama o escríbenos por WhatsApp.
      </Alert>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5" aria-describedby="contact-help">
      <p id="contact-help" className="text-muted">
        No incluyas síntomas, diagnósticos ni otra información médica en este formulario.
      </p>
      {status === "error" ? (
        <Alert tone="danger" role="alert" title="No pudimos enviar tu mensaje">
          Inténtalo nuevamente en unos minutos o contáctanos por teléfono.
        </Alert>
      ) : null}
      {status === "limited" ? (
        <Alert tone="warning" role="alert" title="Demasiados intentos">
          Espera un momento antes de volver a enviar.
        </Alert>
      ) : null}
      <Field id="c-name" label="Nombre" required error={errors.full_name?.message}>
        {(a) => <Input {...a} autoComplete="name" {...register("full_name")} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-email" label="Correo" error={errors.email?.message} description="Correo o teléfono, al menos uno.">
          {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
        </Field>
        <Field id="c-phone" label="Teléfono" error={errors.phone?.message}>
          {(a) => <Input {...a} type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} />}
        </Field>
      </div>
      <Field id="c-topic" label="Motivo" required error={errors.topic?.message}>
        {(a) => (
          <Select {...a} {...register("topic")}>
            <option value="cita">Coordinar una cita</option>
            <option value="informacion">Información general</option>
            <option value="otro">Otro</option>
          </Select>
        )}
      </Field>
      <Field id="c-message" label="Mensaje (opcional)" error={errors.message?.message}>
        {(a) => <Textarea {...a} maxLength={1000} {...register("message")} />}
      </Field>
      <div aria-hidden="true" className="hidden">
        <label htmlFor="c-website">No completar</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Checkbox
        id="c-privacy"
        error={errors.privacy?.message}
        label={
          <>
            Autorizo el uso de mis datos para responder esta consulta, según la{" "}
            <a href="/privacidad" className="text-plum underline underline-offset-4" target="_blank" rel="noopener">
              política de privacidad
            </a>
            .
          </>
        }
        {...register("privacy")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
