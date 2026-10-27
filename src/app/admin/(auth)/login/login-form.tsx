"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error: authError } = await createBrowserSupabase().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (authError) {
      // Mensaje genérico: no revela si el correo existe.
      setError(authError.status === 429 ? "Demasiados intentos. Espera unos minutos." : "Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/admin/mfa");
    router.refresh();
  };

  return (
    <Card>
      <h1 className="text-3xl">Iniciar sesión</h1>
      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field id="email" label="Correo">
          {(a) => <Input {...a} name="email" type="email" autoComplete="username" required />}
        </Field>
        <Field id="password" label="Contraseña">
          {(a) => <Input {...a} name="password" type="password" autoComplete="current-password" required />}
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <a href="/admin/recuperar" className="mt-4 inline-block text-sm text-plum underline underline-offset-4">
        Olvidé mi contraseña
      </a>
    </Card>
  );
}
