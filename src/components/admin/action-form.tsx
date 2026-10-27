"use client";

import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export type ActionResult = { ok: boolean | null; message?: string };
export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Formulario con acción del servidor, mensaje de resultado accesible y bloqueo mientras envía. */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  submitVariant = "primary",
  className,
  inline = false,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: null });
  return (
    <form action={formAction} className={cn(inline ? "inline-flex flex-wrap items-center gap-2" : "space-y-4", className)}>
      {state.ok === false ? (
        <Alert tone="danger" role="alert" className={inline ? "w-full" : undefined}>
          {state.message}
        </Alert>
      ) : null}
      {state.ok === true && state.message ? (
        <Alert tone="success" role="status" className={inline ? "w-full" : undefined}>
          {state.message}
        </Alert>
      ) : null}
      <fieldset disabled={pending} className={cn("min-w-0", inline ? "contents" : "space-y-4")}>
        {children}
        <Button type="submit" variant={submitVariant} size={inline ? "sm" : "md"}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </fieldset>
    </form>
  );
}
