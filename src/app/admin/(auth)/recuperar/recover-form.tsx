"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function RecoverForm() {
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    await createBrowserSupabase().auth.resetPasswordForEmail(email).catch(() => null);
    // Respuesta idéntica exista o no la cuenta.
    setSent(true);
  };
  return (
    <Card>
      <h1 className="text-3xl">Recuperar acceso</h1>
      {sent ? (
        <Alert tone="success" role="status" className="mt-4">
          Si el correo pertenece al personal, recibirás un enlace para definir una nueva contraseña.
        </Alert>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field id="email" label="Correo">
            {(a) => <Input {...a} name="email" type="email" autoComplete="username" required />}
          </Field>
          <Button type="submit" className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
    </Card>
  );
}
