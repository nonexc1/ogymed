import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { sql } from "./db";
import { createStaffUser, loginWithMfa } from "./staff";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `${label}\n${summary.join("\n")}`).toEqual([]);
}

test.beforeEach(async () => {
  await sql("delete from private.rate_limits");
});

test("páginas públicas sin violaciones WCAG 2.2 AA detectables @mobile", async ({ page }) => {
  for (const path of ["/", "/servicios", "/servicios/consulta-ginecologica", "/equipo", "/equipo/profesional-demo-a", "/contacto", "/preguntas-frecuentes", "/blog/articulo-de-ejemplo", "/cookies", "/privacidad"]) {
    await page.goto(path);
    await expectNoViolations(page, path);
  }
});

test("flujo de reserva accesible en cada paso @mobile", async ({ page }) => {
  await page.goto("/reservar");
  await expectNoViolations(page, "servicio");
  await page.getByRole("button", { name: /Consulta ginecológica/ }).click();
  await expectNoViolations(page, "profesional");
  await page.getByRole("button", { name: /Primera disponibilidad/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).first().waitFor();
  await expectNoViolations(page, "horario");
  await page.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).getByRole("button").first().click();
  await page.getByLabel("Nombre y apellido").waitFor();
  await expectNoViolations(page, "contacto");
  // Errores asociados a campos.
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Nombre y apellido")).toHaveAttribute("aria-invalid", "true");
  await expectNoViolations(page, "contacto con errores");
  await page.goto("/cita/gestionar");
  await expectNoViolations(page, "gestionar");
  await page.goto("/libro-de-reclamaciones");
  await expectNoViolations(page, "reclamaciones");
});

test("panel accesible: login y agenda", async ({ page }) => {
  await page.goto("/admin/login");
  await expectNoViolations(page, "login");
  const user = await createStaffUser(["admin"]);
  await loginWithMfa(page, user);
  for (const path of ["/admin", "/admin/agenda", "/admin/agenda/nueva", "/admin/servicios", "/admin/configuracion"]) {
    await page.goto(path);
    await expectNoViolations(page, path);
  }
});

/** Avanza con Tab hasta que el elemento indicado tenga el foco (máx. 60 pasos) y lo activa con Enter. */
async function tabAndPress(page: Page, target: import("@playwright/test").Locator, key = "Enter") {
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      await page.keyboard.press(key);
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("No se alcanzó el elemento con el teclado");
}

test("reserva operable sólo con teclado hasta los datos de contacto", async ({ page }) => {
  await page.goto("/reservar");
  await tabAndPress(page, page.getByRole("button", { name: /Consulta ginecológica/ }));
  await expect(page.getByRole("heading", { name: "¿Con quién quieres atenderte?" })).toBeFocused();
  await tabAndPress(page, page.getByRole("button", { name: /Primera disponibilidad/ }));
  await expect(page.getByRole("heading", { name: "Elige fecha y hora" })).toBeFocused();
  await tabAndPress(page, page.getByRole("button", { name: "Siguiente" }));
  const firstTime = page.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).getByRole("button").first();
  await firstTime.waitFor();
  await tabAndPress(page, firstTime);
  await expect(page.getByRole("heading", { name: "Tus datos de contacto" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Nombre y apellido")).toBeFocused();
  // El foco es visible (outline del sistema de diseño).
  const outline = await page.getByLabel("Nombre y apellido").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});
