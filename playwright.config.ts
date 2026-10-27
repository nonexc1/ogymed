import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// Claves locales de Supabase para crear usuarios de prueba (nunca claves de producción).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/**
 * E2E contra la app real y Supabase local (`pnpm db:start` + `pnpm db:reset`).
 * Usa EMAIL_TRANSPORT=dev-file para leer códigos/correos desde .dev-mail/ (nunca correos reales).
 */
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    locale: "es-PE",
    timezoneId: "America/Lima",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
