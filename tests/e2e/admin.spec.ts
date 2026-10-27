import { expect, test } from "@playwright/test";

import { sql } from "./db";
import { createStaffUser, loginWithMfa } from "./staff";

test.beforeEach(async () => {
  await sql("delete from private.rate_limits");
});

test("acceso del personal exige contraseña + MFA; sin MFA no hay panel", async ({ page }) => {
  const user = await createStaffUser(["reception"]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill("incorrecta-123A");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos" })).toBeVisible();

  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Verificación en dos pasos" })).toBeVisible();
  // Con sesión aal1 el panel redirige a MFA.
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/mfa$/);

  await loginWithMfa(page, user);
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  await page.goto("/admin/agenda");
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  // Recepción no accede a usuarios ni configuración.
  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/sin-acceso/);
});

test("recepción registra una cita por WhatsApp con la misma validación de agenda", async ({ page }) => {
  const user = await createStaffUser(["reception"]);
  await loginWithMfa(page, user);
  await page.goto("/admin/agenda/nueva");
  await page.getByLabel("Servicio").selectOption({ label: "Consulta ginecológica" });
  // Día dentro de la semana próxima con horario demo (lunes a viernes).
  const target = new Date(Date.now() + 8 * 86_400_000);
  while ([0, 6].includes(target.getUTCDay())) target.setUTCDate(target.getUTCDate() + 1);
  await page.getByLabel("Fecha").fill(target.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Ver horarios disponibles" }).click();
  const slot = page.getByRole("button", { pressed: false }).filter({ hasText: /^\d{2}:\d{2}/ }).first();
  await slot.click();
  await page.getByLabel("Nombre de la paciente").fill("Paciente Ficticia WhatsApp");
  await page.getByLabel("Teléfono").fill("987654321");
  await page.getByRole("button", { name: "Registrar cita" }).click();
  await expect(page.getByRole("heading", { name: /^Cita ·/ })).toBeVisible();
  await expect(page.getByText("Origen: WhatsApp")).toBeVisible();
  await expect(page.getByText("Confirmada")).toBeVisible();
  // El acceso al contacto queda auditado.
  const audit = await sql<{ n: number }>("select count(*)::int as n from public.audit_log where action = 'contact.view' and actor_user_id = $1", [user.id]);
  expect(audit[0]!.n).toBeGreaterThan(0);
});

test("editor no accede a citas; publicar un servicio exige revisión médica", async ({ page, browser }) => {
  const editor = await createStaffUser(["editor"]);
  await loginWithMfa(page, editor);
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/sin-acceso/);

  const slug = `servicio-e2e-${Date.now()}`;
  await page.goto("/admin/servicios/nuevo");
  await page.getByLabel("Nombre").fill("Servicio de prueba E2E");
  await page.getByLabel("Slug (URL)").fill(slug);
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await expect(page.getByRole("heading", { name: "Servicio de prueba E2E" })).toBeVisible();
  await page.getByLabel("Resumen").fill("Resumen ficticio para la prueba.");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText(/^Guardado/)).toBeVisible();
  // Sin revisión no hay botón de publicar para el editor.
  await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Enviar a revisión médica" }).click();
  await expect(page.getByTestId("content-status")).toHaveText(/En revisión médica/);
  // Borrador no visible al público.
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  expect((await ap.goto(`/servicios/${slug}`))?.status()).toBe(404);

  // Revisora médica habilitada aprueba y publica.
  const reviewer = await createStaffUser(["professional"], { canReviewMedical: true, doctorId: "00000000-0000-4000-8000-00000000d001" });
  const rctx = await browser.newContext();
  const rp = await rctx.newPage();
  await loginWithMfa(rp, reviewer);
  const [{ id }] = await sql<{ id: string }>("select id from public.services where slug = $1", [slug]);
  await rp.goto(`/admin/servicios/${id}`);
  await rp.getByRole("button", { name: "Aprobar revisión médica y publicar" }).click();
  await expect(rp.getByTestId("content-status")).toHaveText(/^Publicado$/);
  const res = await ap.goto(`/servicios/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(ap.getByRole("heading", { level: 1, name: "Servicio de prueba E2E" })).toBeVisible();
  await expect(ap.getByText(/Revisado por el equipo médico/)).toBeVisible();
  await anon.close();
  await rctx.close();
});
