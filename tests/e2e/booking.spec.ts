import { expect, test } from "@playwright/test";

import { codeFrom, mailFor, sql } from "./db";

const uniqueEmail = (tag: string) => `paciente-${tag}-${Date.now()}@example.test`;

/** Elige el primer horario de la semana siguiente (fuera del plazo mínimo de cancelación). */
async function pickNextWeekSlot(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Siguiente" }).click();
  const slot = page.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).getByRole("button").first();
  await slot.click();
}

test.beforeEach(async () => {
  await sql("delete from private.rate_limits");
});

test("reserva completa: servicio → horario → verificación → confirmación → gestión → cancelación @mobile", async ({ page }) => {
  const email = uniqueEmail("flujo");
  await page.goto("/reservar");
  await page.getByRole("button", { name: /Consulta ginecológica/ }).click();
  await page.getByRole("button", { name: /Primera disponibilidad/ }).click();
  await expect(page.getByRole("heading", { name: "Elige fecha y hora" })).toBeFocused();

  await pickNextWeekSlot(page);
  await expect(page.getByText("Horario reservado temporalmente")).toBeVisible();

  await page.getByLabel("Nombre y apellido").fill("Paciente Ficticia");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel(/Autorizo el tratamiento/).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  const codeMail = await mailFor(email, (m) => m.subject.includes("código"));
  expect(codeMail.subject).not.toMatch(/consulta|ginecol/i);
  await page.getByLabel("Código de verificación").fill(codeFrom(codeMail));
  await page.getByRole("button", { name: "Verificar" }).click();

  await expect(page.getByRole("heading", { name: "Revisa y confirma" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cita" }).click();
  await expect(page.getByRole("heading", { name: "Tu cita está confirmada" })).toBeVisible();

  // Correo de confirmación por outbox: asunto discreto, enlace con fragmento y adjunto ICS genérico.
  const confirmation = await mailFor(email, (m) => m.subject.includes("confirmada"));
  expect(confirmation.subject).not.toMatch(/consulta|ginecol/i);
  expect(confirmation.text).toMatch(/\/cita\/acceso#t=/);
  expect(confirmation.attachments?.[0]?.filename).toBe("cita-ogymed.ics");

  // Gestión inmediata (cookie de sesión de gestión) y cancelación con confirmación.
  await page.getByRole("link", { name: "Ver o gestionar mi cita" }).click();
  await expect(page.getByRole("heading", { name: "Tus citas" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Sí, cancelar cita" }).click();
  await expect(page.getByText("Tu cita fue cancelada")).toBeVisible();
  const rows = await sql<{ status: string }>(
    "select a.status from public.appointments a join public.contacts c on c.id = a.contact_id where c.email = $1",
    [email],
  );
  expect(rows.map((r) => r.status)).toEqual(["cancelled"]);
});

test("el enlace del correo no se canjea por GET y es de un solo uso", async ({ page, browser }) => {
  const email = uniqueEmail("enlace");
  await page.goto("/reservar?servicio=consulta-ginecologica");
  await page.getByRole("button", { name: /Primera disponibilidad/ }).click();
  await pickNextWeekSlot(page);
  await page.getByLabel("Nombre y apellido").fill("Paciente Ficticia");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel(/Autorizo el tratamiento/).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Código de verificación").fill(codeFrom(await mailFor(email, (m) => m.subject.includes("código"))));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.getByRole("button", { name: "Confirmar cita" }).click();
  await expect(page.getByRole("heading", { name: "Tu cita está confirmada" })).toBeVisible();

  const mail = await mailFor(email, (m) => m.subject.includes("confirmada"));
  const link = /(https?:\/\/\S+\/cita\/acceso#t=[A-Za-z0-9_-]+)/.exec(mail.text)![1]!;
  const path = link.replace(/^https?:\/\/[^/]+/, "");

  // Un «escáner» que visita el enlace no consume el token.
  const scanner = await browser.newContext();
  const sp = await scanner.newPage();
  await sp.goto(path);
  await expect(sp.getByRole("button", { name: "Continuar a mi cita" })).toBeVisible();
  // El token se retira de la URL.
  await expect(sp).toHaveURL(/\/cita\/acceso$/);
  await scanner.close();

  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  await vp.goto(path);
  await vp.getByRole("button", { name: "Continuar a mi cita" }).click();
  await expect(vp.getByRole("heading", { name: "Tus citas" })).toBeVisible();
  await expect(vp).toHaveURL(/\/cita\/gestionar$/);
  await visitor.close();

  // Segundo uso: rechazado con mensaje genérico.
  const again = await browser.newContext();
  const ap = await again.newPage();
  await ap.goto(path);
  await ap.getByRole("button", { name: "Continuar a mi cita" }).click();
  await expect(ap.getByText(/no es válido, ya se usó o venció/)).toBeVisible();
  await again.close();
});

test("conflicto: si otra persona retuvo el horario, se informa y se ofrecen otras opciones", async ({ page, browser }) => {
  await page.goto("/reservar?servicio=colposcopia");
  await page.getByRole("button", { name: /Primera disponibilidad/ }).click();
  const slot = page.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).getByRole("button").first();
  const label = (await slot.textContent())?.slice(0, 5) ?? "";

  const other = await browser.newContext();
  const op = await other.newPage();
  await op.goto("/reservar?servicio=colposcopia");
  await op.getByRole("button", { name: /Primera disponibilidad/ }).click();
  await op.locator("fieldset").filter({ hasText: /Mañana|Tarde/ }).getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
  await expect(op.getByText("Horario reservado temporalmente")).toBeVisible();
  await other.close();

  await slot.click();
  await expect(page.getByRole("alert").filter({ hasText: /acaba de ser reservado|ya no está disponible/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Elige fecha y hora" })).toBeVisible();
});
