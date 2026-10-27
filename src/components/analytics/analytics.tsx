"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  ANALYTICS_PAGE_TITLE,
  isAnalyticsAllowedPath,
  isValidMeasurementId,
  sanitizeEventParams,
  sanitizePageLocation,
} from "@/lib/analytics/policy";

import { useConsent } from "./consent-client";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __ogymedGaId?: string;
  }
}

function loadGtag(id: string) {
  if (window.__ogymedGaId) return;
  window.__ogymedGaId = id;
  window.dataLayer = window.dataLayer || [];
  // gtag exige `arguments`, no un array.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_title: ANALYTICS_PAGE_TITLE,
    page_referrer: "",
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/**
 * Carga GA4 sólo con consentimiento, ID válido y ruta permitida; envía page_view saneado.
 * Si el consentimiento se retira con GA cargado, se recarga la página para descargar el script.
 */
export function Analytics({ measurementId }: { measurementId: string | null }) {
  const pathname = usePathname();
  const granted = useConsent()?.analytics === true;

  // Retirada del consentimiento con GA ya cargado: recargar para descargar el script.
  useEffect(() => {
    if (!granted && window.__ogymedGaId) window.location.reload();
  }, [granted]);

  useEffect(() => {
    if (!granted || !isValidMeasurementId(measurementId) || !isAnalyticsAllowedPath(pathname)) return;
    const location = sanitizePageLocation(window.location.origin, pathname);
    if (!location) return;
    loadGtag(measurementId);
    window.gtag!("set", { page_location: location, page_title: ANALYTICS_PAGE_TITLE, page_referrer: "" });
    window.gtag!("event", "page_view", { page_location: location, page_title: ANALYTICS_PAGE_TITLE, page_referrer: "" });
  }, [granted, measurementId, pathname]);

  return null;
}

/** Envía un evento permitido sólo si GA ya está cargado y la ruta actual lo permite. */
export function trackEvent(event: string, position: string) {
  if (typeof window === "undefined" || !window.gtag || !window.__ogymedGaId) return;
  if (!isAnalyticsAllowedPath(window.location.pathname)) return;
  const params = sanitizeEventParams(event, position);
  if (!params) return;
  window.gtag("event", event, params);
}
