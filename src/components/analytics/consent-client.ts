"use client";

import { useSyncExternalStore } from "react";

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
  parseConsent,
  type ConsentState,
} from "@/lib/analytics/policy";

export const CONSENT_EVENT = "ogymed:consent-changed";
export const OPEN_CONSENT_EVENT = "ogymed:open-consent";

function rawConsentCookie(): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return match ? match.slice(CONSENT_COOKIE.length + 1) : null;
}

export function readConsent(): ConsentState | null {
  return parseConsent(rawConsentCookie());
}

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

/**
 * Consentimiento leído de la cookie como fuente externa. En el servidor (y en la hidratación) es
 * `undefined`: nada opcional se activa hasta conocer la elección real en el navegador.
 */
export function useConsent(): ConsentState | null | undefined {
  const raw = useSyncExternalStore(subscribe, () => rawConsentCookie() ?? "", () => undefined);
  return raw === undefined ? undefined : parseConsent(raw || null);
}

export function writeConsent(analytics: boolean) {
  const value: ConsentState = { v: CONSENT_VERSION, analytics, ts: Date.now() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${
    CONSENT_MAX_AGE_DAYS * 86400
  }; Path=/; SameSite=Lax${secure}`;
  if (!analytics) clearAnalyticsCookies();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Elimina cookies de GA (_ga, _ga_*) del dominio actual y del dominio padre. */
export function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0] ?? "";
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      for (const d of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
      }
    }
  }
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
