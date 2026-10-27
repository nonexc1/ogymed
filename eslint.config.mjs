import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "supabase/**",
  ]),
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      // Intencional: los enlaces entre root layouts (público ↔ reservas/admin) y hacia rutas sin
      // analítica usan <a> para forzar una carga completa y descargar cualquier script de GA4.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);
