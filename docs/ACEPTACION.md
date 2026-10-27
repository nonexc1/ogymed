# Aceptación

Estados: ✅ **Verificado** (con evidencia reproducible) · 🟡 **Pendiente** (falta trabajo o datos) ·
⛔ **Bloqueado** (requiere cuentas, credenciales o decisiones externas).
Entorno de verificación: contenedor de desarrollo, Node 22, Supabase local (CLI 2.122, Postgres 17,
GoTrue, PostgREST, Storage, Mailpit), Chromium de Playwright 1.63. **Nada de esto prueba producción.**
Última ejecución completa: 2026-10-27.

## Resumen de la última ejecución

| Comando | Resultado |
|---|---|
| `pnpm lint` | ✅ sin errores ni avisos |
| `pnpm typecheck` | ✅ sin errores |
| `pnpm test` (unitarias) | ✅ 4 archivos, 21 pruebas |
| `pnpm db:reset` | ✅ 5 migraciones + seed demo desde cero |
| `pnpm test:db` | ✅ 2 archivos, 40 pruebas (repetida 12+ veces seguidas sin fallos tras corregir un deadlock) |
| `pnpm build` | ✅ build de producción (páginas públicas estáticas/ISR; reservas, panel y API dinámicas) |
| `pnpm test:e2e` | ✅ 16 pruebas (13 escritorio + 3 móvil Pixel 7) |
| `pnpm audit --prod` | ✅ «No known vulnerabilities found» |

## Criterios del encargo (§13)

| # | Criterio | Estado | Evidencia / procedimiento |
|---|---|---|---|
| 1 | Build, lint y typecheck correctos; sin secretos; sin dependencias críticas conocidas | ✅ | Comandos anteriores; `.env*` ignorados por git (`git ls-files` sin `.env` salvo `.env.example`); `pnpm audit --prod` |
| 2 | Dos reservas concurrentes del mismo horario: sólo una gana | ✅ | `tests/db/booking.test.ts` «dos reservas concurrentes…», «estrés: 12 conexiones simultáneas…» (1 gana, 11 códigos limpios, 0 errores) |
| 3 | Intervalos distintos que se solapan: sólo uno gana | ✅ | «intervalos distintos que se solapan (10:00–11:00 y 10:30–11:30)…» con 6 conexiones en paralelo |
| 4 | Hold expirado, idempotencia, doble clic, duración modificada, feriado, bloqueo, profesional inactivo, fechas pasadas | ✅ | `booking.test.ts`: «un hold vencido…», «reintentos con la misma clave (incluso concurrentes)…», «doble clic al retener…», «la duración y el fin los decide el servidor…», «respeta feriados de sede y bloqueos…», «profesional inactivo…», «no ofrece fechas pasadas…» |
| 5 | Reprogramación fallida conserva original; cancelación libera cupo; recepción y web compiten por la misma capacidad | ✅ | «reprogramación fallida conserva…», «cancelar libera el cupo», «recepción y web compiten…»; e2e «recepción registra una cita por WhatsApp…» |
| 6 | Buffers y recursos compartidos | ✅ | «los buffers bloquean horarios adyacentes», «recursos compartidos: dos profesionales no usan el mismo equipo a la vez» |
| 7 | RLS/endpoints: anónimo no lee contactos; editor no lee citas; profesional no lee agenda ajena; rol no autoasignable | ✅ | `tests/db/security.test.ts` (6 casos de RLS y roles, MFA aal1 vs aal2, service_role sin acceso a tablas); e2e «editor no accede a citas…», «recepción no accede a usuarios» |
| 8 | Tokens vencidos/usados no sirven; acceso a otra cita denegado; GET no modifica citas | ✅ | `security.test.ts` «token canjeable una sola vez…»; e2e «el enlace del correo no se canjea por GET y es de un solo uso» |
| 9 | Outbox: correo fallido visible, reintentos sin duplicados, recordatorio obsoleto descartado | ✅ | `security.test.ts` «reintentos con backoff, fallo visible y reintento manual sin duplicados», «un recordatorio de una cita reprogramada… queda obsoleto»; dos workers concurrentes nunca reclaman el mismo mensaje |
| 10 | Entrega real de correo de prueba | ⛔ | Requiere cuenta Resend, dominio verificado (SPF/DKIM/DMARC). Probado sólo el transporte local `dev-file` |
| 11 | CMS: borrador no visible, revisión médica requerida, publicación/revalidación, cambio de slug con 301 | ✅ | `security.test.ts` (CMS, 4 casos incl. bucles); e2e «editor… publicar un servicio exige revisión médica» (404 antes, 200 tras aprobar); 301 real por HTTP verificado con `curl` contra `pnpm start` |
| 12 | Analytics: rechazo = 0 peticiones; aceptación sólo en rutas permitidas; reservas/formularios privados = 0 y sin fugas al navegar | ✅ | `tests/e2e/analytics.spec.ts` con interceptación de toda petición a dominios de Google (incl. navegación cliente y retirada del consentimiento); unitarias `analytics-policy.test.ts` |
| 13 | Verificación en DebugView con datos sintéticos | ⛔ | Requiere propiedad GA4 de pruebas (procedimiento en `GOOGLE_SETUP.md`) |
| 14 | Flujo web/admin en móvil y escritorio | ✅ | e2e de reserva completa en escritorio y Pixel 7; panel en escritorio |
| 15 | Revisión visual (portada, servicio, médico, reserva, agenda) | ✅ parcial | Capturas revisadas: portada (escritorio/móvil), servicio, pasos de reserva (escritorio/móvil). Agenda revisada vía pruebas y axe; revisión visual humana pendiente con contenido real |
| 16 | Teclado y axe | ✅ | `tests/e2e/a11y.spec.ts`: 0 violaciones WCAG 2.0/2.1/2.2 A/AA (axe) en 10 páginas públicas, cada paso de reserva (incl. errores), gestión, reclamaciones, login y 5 vistas del panel; reserva operable sólo con teclado con foco visible |
| 17 | Sitemap, canonical, OG, status HTTP, robots, redirecciones, JSON-LD | ✅ | Smoke con `pnpm start`: fuera de producción `noindex` + `Disallow: /` + sitemap vacío; en modo producción (`APP_ENV=production SITE_INDEXING=on`) robots con sitemap, sólo páginas publicadas, sin datos demo, canonical al dominio configurado, HSTS; 404 real; JSON-LD `MedicalClinic` sólo con datos existentes |
| 18 | Validación externa de datos estructurados (Rich Results / validator.schema.org) | 🟡 | Requiere URL pública |
| 19 | Respaldo/restauración ensayados con datos sintéticos | ✅ local / ⛔ plataforma | Ensayo `pg_dump`/`pg_restore` (ver `OPERATIONS.md` §3): conteos idénticos, `EXCLUDE` y 57 políticas RLS restauradas. Pendiente en Supabase Pro y respaldo de Storage |
| 20 | MFA para administración y acceso a citas | ✅ | RLS exige `aal2`; e2e de login (sin MFA → redirección a `/admin/mfa`); `security.test.ts` (aal1 no ve citas) |
| 21 | Registro público de personal deshabilitado | ✅ | `POST /auth/v1/signup` → `signup_disabled` (verificado con `curl` en local) |

## Rendimiento (laboratorio, no campo)

Lighthouse 13.5 móvil contra `pnpm start` local (sin CDN). SEO baja sólo por `is-crawlable`, que es el
`noindex` intencional fuera de producción.

| Página | Simulado: Perf / A11y / BP | LCP sim. | Throttling aplicado (devtools): Perf / LCP | CLS | TBT |
|---|---|---|---|---|---|
| `/` | 94 / 100 / 100 | 3,1 s | 95 / 1,7 s | 0 | 70 ms |
| `/servicios/consulta-ginecologica` | 94 / 100 / 100 | 3,1 s | — | 0 | 80 ms |
| `/contacto` | 92 / 100 / 100 | 3,2 s | 92 / 1,7 s | 0 | 120 ms |
| `/reservar` | 91 / 100 / 100 | 2,6 s | — | 0 | 290 ms |

El LCP simulado supera la meta de 2,5 s porque el modelo de Lighthouse incluye la carga de la fuente
de títulos; con throttling aplicado el LCP real fue 1,7 s. **Las métricas de campo (p75 en Search
Console) son las que cuentan y no existen hasta tener tráfico real.**

## Pendientes antes de producción (resumen)

* ⛔ Datos y textos reales aprobados (`DATOS_PENDIENTES.md`), validación legal (`PRIVACY_REVIEW.md`).
* ⛔ Cuentas: Vercel, Supabase Pro, Resend + DNS, Google (Search Console, GA4 opcional, Business Profile).
* ⛔ Envío real de correo (verificación, confirmación, invitaciones por SMTP de Auth).
* 🟡 Ensayo de restauración en Supabase Pro y respaldo de Storage.
* 🟡 Revisión visual con fotografías y contenido reales; prueba con lector de pantalla real (NVDA/VoiceOver).
* 🟡 Job de retención/anonimización con plazos aprobados.
* 🟡 Medición de latencia desde Lima para elegir región.
