import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { sql } from "./db";
import { createStaffUser, loginWithMfa } from "./staff";

const GA_ID = "G-TEST1234";
const GOOGLE = /google-analytics\.com|googletagmanager\.com|analytics\.google\.com|doubleclick\.net/;

/** Intercepta TODO tráfico a Google: lo registra y responde localmente (nada sale a internet). */
async function trapGoogle(context: BrowserContext) {
  const hits: string[] = [];
  await context.route(GOOGLE, (route) => {
    hits.push(route.request().url());
    if (route.request().url().includes("/gtag/js")) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "window.__gtagStub = true;" });
    }
    return route.fulfill({ status: 204, body: "" });
  });
  return hits;
}

async function setGaId(page: Page, value: string) {
  await page.goto("/admin/configuracion");
  await page.getByLabel("GA4 · ID de medición").fill(value);
  await page.getByRole("button", { name: "Guardar datos públicos" }).click();
  await expect(page.getByText(/Configuración pública guardada/)).toBeVisible();
}

type DL = unknown[][];
const dataLayer = (page: Page) => page.evaluate(() => (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>))) as Promise<DL>;

test.describe.serial("analítica con consentimiento y lista permitida", () => {
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    await sql("delete from private.rate_limits");
    const admin = await createStaffUser(["admin"]);
    adminPage = await (await browser.newContext()).newPage();
    await loginWithMfa(adminPage, admin);
    await setGaId(adminPage, GA_ID);
  });

  test.afterAll(async () => {
    await setGaId(adminPage, "");
    await adminPage.context().close();
  });

  test("sin elección y tras rechazar: cero peticiones a Google; reservar sigue disponible", async ({ browser }) => {
    const context = await browser.newContext();
    const hits = await trapGoogle(context);
    const page = await context.newPage();
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    // Las tres opciones tienen el mismo peso visual.
    const classes = await Promise.all(["Aceptar", "Rechazar", "Configurar"].map((n) => banner.getByRole("button", { name: n, exact: true }).getAttribute("class")));
    expect(new Set(classes).size).toBe(1);
    expect(hits).toEqual([]);

    await banner.getByRole("button", { name: "Rechazar" }).click();
    for (const path of ["/", "/servicios", "/contacto", "/equipo"]) await page.goto(path);
    expect(hits).toEqual([]);
    const consent = (await context.cookies()).find((c) => c.name === "ogymed_consent");
    expect(decodeURIComponent(consent!.value)).toContain('"analytics":false');
    await page.goto("/reservar");
    await expect(page.getByRole("heading", { name: /¿Qué servicio necesitas\?|Solicitar cita/ })).toBeVisible();
    await context.close();
  });

  test("con aceptación: sólo rutas permitidas, location saneada y nada en rutas sensibles", async ({ browser }) => {
    const context = await browser.newContext();
    const hits = await trapGoogle(context);
    const page = await context.newPage();
    await page.goto("/?correo=paciente@example.test#x");
    await page.getByTestId("consent-banner").getByRole("button", { name: "Aceptar" }).click();
    await expect.poll(() => hits.some((h) => h.includes(`/gtag/js?id=${GA_ID}`))).toBe(true);

    const dl = await dataLayer(page);
    const config = dl.find((e) => e[0] === "config");
    expect(config?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_title: "OGYMED" });
    const consentDefault = dl.find((e) => e[0] === "consent" && e[1] === "default");
    expect(consentDefault?.[2]).toMatchObject({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    const pv = dl.filter((e) => e[0] === "event" && e[1] === "page_view").map((e) => e[2] as Record<string, string>);
    expect(pv.at(-1)).toEqual({ page_location: "http://localhost:3000/", page_title: "OGYMED", page_referrer: "" });
    expect(JSON.stringify(dl)).not.toMatch(/paciente@example\.test|correo=/);

    // Navegación cliente entre rutas permitidas: page_view saneado de la nueva ruta.
    await page.getByRole("link", { name: "Ver todos los servicios" }).click();
    await expect(page).toHaveURL(/\/servicios$/);
    await expect.poll(async () => (await dataLayer(page)).some((e) => e[1] === "page_view" && (e[2] as Record<string, string>).page_location === "http://localhost:3000/servicios")).toBe(true);

    // Hacia un servicio concreto: recarga completa → sin GA en la página sensible.
    const before = hits.length;
    await page.getByRole("link", { name: /Colposcopia/ }).first().click();
    await expect(page).toHaveURL(/\/servicios\/colposcopia$/);
    expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");
    expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
    expect(hits.length).toBe(before);

    // Reservas, autogestión, reclamaciones y admin: cero peticiones.
    for (const path of ["/reservar", "/cita/gestionar", "/libro-de-reclamaciones", "/admin/login", "/privacidad", "/blog/articulo-de-ejemplo", "/equipo/profesional-demo-a"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => typeof window.gtag), path).toBe("undefined");
    }
    expect(hits.length).toBe(before);
    await context.close();
  });

  test("retirar el consentimiento descarga GA y no se envía nada más", async ({ browser }) => {
    const context = await browser.newContext();
    const hits = await trapGoogle(context);
    const page = await context.newPage();
    await page.goto("/");
    await page.getByTestId("consent-banner").getByRole("button", { name: "Aceptar" }).click();
    await expect.poll(() => hits.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Configurar cookies" }).click();
    await page.getByLabel(/Analítica/).uncheck();
    await page.getByRole("button", { name: "Guardar selección" }).click();
    await page.waitForLoadState("load");
    await expect.poll(() => page.evaluate(() => typeof window.gtag)).toBe("undefined");
    const count = hits.length;
    await page.goto("/contacto");
    expect(hits.length).toBe(count);
    await context.close();
  });
});
