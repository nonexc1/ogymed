"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { OPEN_CONSENT_EVENT, useConsent, writeConsent } from "./consent-client";

/**
 * Banner de cookies: «Aceptar», «Rechazar» y «Configurar» con el mismo peso visual.
 * Analítica desactivada por defecto; rechazar no bloquea nada (tampoco reservar).
 * Sin cookies opcionales configuradas no se interrumpe con un banner (la información está en /cookies).
 */
export function ConsentBanner({ analyticsAvailable }: { analyticsAvailable: boolean }) {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState<boolean | null>(null);
  const titleId = useId();
  const regionRef = useRef<HTMLDivElement>(null);

  const open = reopened || (consent === null && analyticsAvailable);
  const analytics = analyticsChoice ?? consent?.analytics ?? false;

  useEffect(() => {
    const reopen = () => {
      setAnalyticsChoice(null);
      setConfiguring(true);
      setReopened(true);
      requestAnimationFrame(() => regionRef.current?.focus());
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.consentOpen = open ? "true" : "false";
  }, [open]);

  const decide = (value: boolean) => {
    writeConsent(value);
    setAnalyticsChoice(null);
    setReopened(false);
    setConfiguring(false);
  };

  if (!open) return null;

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      role="region"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper shadow-[0_-8px_30px_rgba(39,35,42,0.12)]"
      data-testid="consent-banner"
    >
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
        <h2 id={titleId} className="font-sans text-lg font-semibold text-ink">
          Tu privacidad
        </h2>
        <p className="mt-1 max-w-3xl text-base text-muted">
          Usamos cookies necesarias para que el sitio funcione.{" "}
          {analyticsAvailable
            ? "Con tu permiso, también usamos Google Analytics en páginas generales para entender cómo se usa la web. Nunca en reservas ni en páginas sobre servicios concretos."
            : "Por ahora no usamos cookies de analítica."}{" "}
          <a className="text-plum underline underline-offset-4" href="/cookies">
            Más información
          </a>
        </p>

        {configuring ? (
          <fieldset className="mt-4 space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 font-semibold">Configurar cookies</legend>
            <div className="flex items-start gap-3">
              <input id="consent-necessary" type="checkbox" checked disabled className="mt-1 size-5 accent-plum" />
              <label htmlFor="consent-necessary">
                <span className="font-semibold">Necesarias</span> — siempre activas: guardan tu elección de cookies y
                la sesión segura durante una reserva.
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input
                id="consent-analytics"
                type="checkbox"
                className="mt-1 size-5 accent-plum"
                checked={analytics}
                disabled={!analyticsAvailable}
                onChange={(e) => setAnalyticsChoice(e.target.checked)}
              />
              <label htmlFor="consent-analytics">
                <span className="font-semibold">Analítica</span> — Google Analytics 4, desactivada por defecto.
              </label>
            </div>
            <Button variant="primary" onClick={() => decide(analytics)}>
              Guardar selección
            </Button>
          </fieldset>
        ) : null}

        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
          <Button variant="secondary" onClick={() => decide(true)} disabled={!analyticsAvailable}>
            Aceptar
          </Button>
          <Button variant="secondary" onClick={() => decide(false)}>
            Rechazar
          </Button>
          <Button variant="secondary" onClick={() => setConfiguring((v) => !v)} aria-expanded={configuring}>
            Configurar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Configurar cookies
    </button>
  );
}
