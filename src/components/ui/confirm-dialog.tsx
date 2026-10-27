"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";

import { Button } from "./button";

/** Diálogo de confirmación accesible (foco atrapado, Escape, título y descripción asociados). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Volver",
  tone = "danger",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] bg-paper p-6 shadow-xl">
          <AlertDialog.Title className="font-display text-2xl text-plum-strong">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-muted">{description}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
