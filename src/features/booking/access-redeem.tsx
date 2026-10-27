"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/surface";

/**
 * Lee el token del fragmento (#t=…), lo retira de la URL y sólo lo canjea cuando la persona pulsa
 * el botón (POST). Visitar el enlace no modifica nada: seguro frente a escáneres de correo.
 */
export function AccessRedeem() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  // La primera lectura se conserva: el efecto puede ejecutarse dos veces (StrictMode) y la URL ya estará limpia.
  const firstRead = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (firstRead.current === undefined) {
      const match = /(?:^|&)t=([A-Za-z0-9_-]{32,128})/.exec(window.location.hash.slice(1));
      firstRead.current = match?.[1] ?? null;
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    setToken(firstRead.current);
  }, []);

  if (token === undefined) return <p role="status" className="text-muted">Preparando el acceso…</p>;
  if (token === null) {
    return (
      <Alert tone="warning" title="Enlace incompleto">
        Abre el enlace completo desde tu correo o{" "}
        <a href="/cita/gestionar" className="text-plum underline underline-offset-4">
          solicita uno nuevo
        </a>
        .
      </Alert>
    );
  }
  return (
    <form method="post" action="/api/manage/redeem" className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-muted">Por seguridad, confirma que quieres abrir la gestión de tu cita. El enlace es de un solo uso.</p>
      <Button type="submit" size="lg">
        Continuar a mi cita
      </Button>
    </form>
  );
}
