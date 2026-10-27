import { describe, expect, it } from "vitest";

import {
  CONSENT_VERSION,
  isAnalyticsAllowedPath,
  isValidMeasurementId,
  normalizePath,
  parseConsent,
  sanitizeEventParams,
  sanitizePageLocation,
} from "@/lib/analytics/policy";

describe("lista permitida de rutas para GA4", () => {
  it("permite sólo páginas generales exactas", () => {
    for (const p of ["/", "/la-clinica", "/servicios", "/equipo", "/contacto", "/blog", "/preguntas-frecuentes", "/primera-visita"]) {
      expect(isAnalyticsAllowedPath(p)).toBe(true);
    }
  });

  it("excluye servicios concretos, artículos, perfiles, reservas, gestión, reclamaciones y admin", () => {
    for (const p of [
      "/servicios/colposcopia",
      "/blog/articulo",
      "/equipo/profesional",
      "/reservar",
      "/reservar?servicio=colposcopia",
      "/cita/gestionar",
      "/cita/acceso",
      "/libro-de-reclamaciones",
      "/admin",
      "/admin/agenda",
      "/privacidad",
    ]) {
      expect(isAnalyticsAllowedPath(p)).toBe(false);
    }
  });

  it("normaliza barras finales, query y fragmento", () => {
    expect(normalizePath("/contacto/")).toBe("/contacto");
    expect(normalizePath("/contacto?x=1#y")).toBe("/contacto");
    expect(isAnalyticsAllowedPath("/contacto/?email=a@b.c")).toBe(true);
  });
});

describe("saneamiento de page_location y eventos", () => {
  it("devuelve origen + ruta sin query ni fragmento", () => {
    expect(sanitizePageLocation("https://ogymed.example", "/contacto?email=a@b.c#x")).toBe("https://ogymed.example/contacto");
  });

  it("devuelve null en rutas no permitidas (no se envía el evento)", () => {
    expect(sanitizePageLocation("https://ogymed.example", "/servicios/colposcopia")).toBeNull();
  });

  it("sólo acepta eventos y posiciones de la lista cerrada", () => {
    expect(sanitizeEventParams("click_book", "header")).toEqual({ position: "header" });
    expect(sanitizeEventParams("click_book", "colposcopia")).toBeNull();
    expect(sanitizeEventParams("purchase", "header")).toBeNull();
  });

  it("valida el formato del ID de medición", () => {
    expect(isValidMeasurementId("G-ABC1234")).toBe(true);
    expect(isValidMeasurementId("UA-123")).toBe(false);
    expect(isValidMeasurementId("")).toBe(false);
  });
});

describe("cookie de consentimiento", () => {
  const encode = (v: unknown) => encodeURIComponent(JSON.stringify(v));

  it("acepta sólo la versión vigente", () => {
    expect(parseConsent(encode({ v: CONSENT_VERSION, analytics: true, ts: 1 }))).toEqual({ v: CONSENT_VERSION, analytics: true, ts: 1 });
    expect(parseConsent(encode({ v: "antigua", analytics: true, ts: 1 }))).toBeNull();
  });

  it("rechaza valores mal formados", () => {
    expect(parseConsent("no-json")).toBeNull();
    expect(parseConsent(encode({ v: CONSENT_VERSION, analytics: "sí", ts: 1 }))).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });
});
