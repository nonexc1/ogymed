"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Mode = { kind: "loading" } | { kind: "enroll"; factorId: string; qr: string; secret: string } | { kind: "verify"; factorId: string };

/**
 * MFA obligatorio (TOTP) para el personal: si no hay factor verificado se inscribe uno (QR + clave),
 * y en cada inicio de sesión se verifica un código para alcanzar el nivel aal2.
 */
export function MfaForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;
      if (!aal) {
        router.replace("/admin/login");
        return;
      }
      if (aal.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp.find((f) => f.status === "verified");
      if (verified) {
        if (active) setMode({ kind: "verify", factorId: verified.id });
        return;
      }
      // Limpia inscripciones a medio terminar y crea una nueva.
      for (const f of factors?.all ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `OGYMED ${new Date().toISOString().slice(0, 10)}` });
      if (!active) return;
      if (enrollError || !data) {
        setError("No se pudo iniciar la configuración de la verificación en dos pasos.");
        return;
      }
      setMode({ kind: "enroll", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode.kind === "loading") return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createBrowserSupabase().auth.mfa.challengeAndVerify({ factorId: mode.factorId, code: code.trim() });
    setBusy(false);
    if (verifyError) {
      setError("El código no es válido o venció. Usa el código actual de tu aplicación.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <Card>
      <h1 className="text-3xl">Verificación en dos pasos</h1>
      {mode.kind === "loading" ? <p role="status" className="mt-4 text-muted">Cargando…</p> : null}
      {mode.kind === "enroll" ? (
        <div className="mt-4 space-y-3">
          <p className="text-muted">
            Escanea este código con una aplicación de autenticación (por ejemplo, Google Authenticator, Microsoft
            Authenticator o 1Password) y escribe el código de 6 dígitos.
          </p>
          {/* QR generado por Supabase Auth como data URI SVG. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode.qr} alt="Código QR para configurar la verificación en dos pasos" width={200} height={200} className="rounded-xl border border-line bg-white p-2" />
          <p className="text-sm text-muted">
            ¿No puedes escanear? Clave: <code className="break-all rounded bg-ivory px-1" data-testid="totp-secret">{mode.secret}</code>
          </p>
        </div>
      ) : null}
      {mode.kind === "verify" ? <p className="mt-4 text-muted">Escribe el código actual de tu aplicación de autenticación.</p> : null}
      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      {mode.kind !== "loading" ? (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field id="totp" label="Código de 6 dígitos">
            {(a) => (
              <Input
                {...a}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.4em]"
                required
              />
            )}
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Verificando…" : "Verificar"}
          </Button>
        </form>
      ) : null}
      <p className="mt-6 text-sm text-muted">
        ¿Perdiste acceso a tu aplicación? Pide a un administrador que restablezca tu verificación en dos pasos (ver guía del
        panel).
      </p>
      <form action="/admin/auth/logout" method="post" className="mt-2">
        <button type="submit" className="text-sm text-plum underline underline-offset-4">
          Cerrar sesión
        </button>
      </form>
    </Card>
  );
}
