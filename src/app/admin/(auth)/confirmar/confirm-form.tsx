"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/surface";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Payload = { tokenHash: string; type: "invite" | "recovery" } | null;

/**
 * Invitaciones y recuperación: el token llega en el fragmento (#) y sólo se canjea al pulsar el botón,
 * para que un escáner de correo no lo consuma.
 */
export function ConfirmForm() {
  const router = useRouter();
  const first = useRef<Payload | undefined>(undefined);
  const [payload, setPayload] = useState<Payload | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (first.current === undefined) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      first.current = tokenHash && (type === "invite" || type === "recovery") ? { tokenHash, type } : null;
      window.history.replaceState(null, "", window.location.pathname);
    }
    setPayload(first.current);
  }, []);

  const confirm = async () => {
    if (!payload) return;
    setBusy(true);
    const { error: otpError } = await createBrowserSupabase().auth.verifyOtp({ token_hash: payload.tokenHash, type: payload.type });
    setBusy(false);
    if (otpError) {
      setError("El enlace no es válido o venció. Pide uno nuevo a un administrador o usa «Olvidé mi contraseña».");
      return;
    }
    router.replace("/admin/contrasena");
  };

  return (
    <Card className="space-y-4">
      <h1 className="text-3xl">Activar acceso</h1>
      {error ? <Alert tone="danger" role="alert">{error}</Alert> : null}
      {payload === undefined ? <p role="status" className="text-muted">Cargando…</p> : null}
      {payload === null ? <Alert tone="warning">Enlace incompleto. Ábrelo completo desde tu correo.</Alert> : null}
      {payload ? (
        <>
          <p className="text-muted">Continúa para definir tu contraseña y configurar la verificación en dos pasos.</p>
          <Button onClick={confirm} disabled={busy} className="w-full">
            Continuar
          </Button>
        </>
      ) : null}
    </Card>
  );
}
