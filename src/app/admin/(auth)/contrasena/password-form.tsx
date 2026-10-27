"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export function PasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!RULE.test(password)) {
      setError("Usa al menos 12 caracteres con mayúsculas, minúsculas y números.");
      return;
    }
    if (password !== form.get("confirm")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await createBrowserSupabase().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.code === "reauthentication_needed" || updateError.status === 401 ? "Tu sesión venció. Solicita un enlace nuevo." : "No se pudo guardar la contraseña. Prueba con otra.");
      return;
    }
    router.replace("/admin/mfa");
  };

  return (
    <Card>
      <h1 className="text-3xl">Define tu contraseña</h1>
      <p className="mt-2 text-muted">Mínimo 12 caracteres con mayúsculas, minúsculas y números. Después configurarás la verificación en dos pasos.</p>
      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field id="password" label="Nueva contraseña">
          {(a) => <Input {...a} name="password" type="password" autoComplete="new-password" required minLength={12} />}
        </Field>
        <Field id="confirm" label="Repite la contraseña">
          {(a) => <Input {...a} name="confirm" type="password" autoComplete="new-password" required minLength={12} />}
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </Card>
  );
}
