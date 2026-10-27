# OGYMED · Web, reservas y panel

Sitio web, reserva de citas en línea y panel administrativo para OGYMED, clínica ginecológica en
Santiago de Surco, Lima. Un único proyecto **Next.js 16 (App Router) + TypeScript** con **Supabase**
(PostgreSQL, Auth, Storage) y **Resend** para correo transaccional.

> Estado: primera versión funcional en desarrollo. **No está en producción** y no contiene datos reales
> de la clínica. Ver `docs/PROGRESS.md`, `docs/ACEPTACION.md` y `docs/DATOS_PENDIENTES.md`.

## Qué incluye

* Web pública (portada, servicios, equipo, la clínica, primera visita, preguntas, blog, contacto y
  páginas legales) alimentada por un CMS con flujo editorial y revisión médica.
* Reserva real: disponibilidad calculada en la base, retención temporal, verificación de correo,
  confirmación idempotente, prevención de solapes por restricción `EXCLUDE`, autogestión con enlace
  seguro, avisos por correo con outbox y reintentos. Modo «Solicitar cita» mientras la agenda no esté lista.
* Panel para personal con invitación + contraseña + MFA (TOTP): agenda, citas, profesionales,
  servicios, horarios, contenido, medios, SEO/redirecciones, configuración, usuarios, reclamaciones,
  auditoría y reportes.
* Consentimiento de cookies y GA4 limitado a rutas generales; SEO técnico y local.

## Requisitos

* Node.js 22 LTS (`.nvmrc`) y pnpm 10.28 (`corepack enable`).
* Docker (para Supabase local).

## Puesta en marcha local

```bash
pnpm install
pnpm db:start            # Supabase local (Postgres 17, Auth, Storage, Mailpit…)
pnpm db:reset            # aplica supabase/migrations y carga supabase/seed.sql (datos DEMO ficticios)
cp .env.example .env.local
pnpm exec supabase status -o env   # copiar API_URL, PUBLISHABLE_KEY y SECRET_KEY a .env.local
# completar BOOKING_CODE_PEPPER y CRON_SECRET con valores aleatorios (openssl rand -base64 48)
# y EMAIL_TRANSPORT=dev-file (los correos se guardan en .dev-mail/, no se envían)
pnpm dev                 # http://localhost:3000
```

Si `supabase start` falla al descargar imágenes de `public.ecr.aws` (límite de descarga), usar Docker
Hub: `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io pnpm db:start`. Para un stack mínimo:
`pnpm exec supabase start -x realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor`.

Primer administrador (envía una invitación; en local llega a Mailpit, http://127.0.0.1:54324):

```bash
pnpm bootstrap:admin --email persona@example.test --name "Nombre Apellido"
```

Abrir el enlace del correo → definir contraseña → configurar MFA → `/admin`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` | ESLint (config de Next) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm test:db` | Pruebas SQL contra Supabase local: concurrencia, RLS, tokens, outbox, CMS |
| `pnpm test:e2e` | Playwright (escritorio y móvil) + axe; requiere Supabase local y `.env.local` |
| `pnpm db:reset` | Recrea la base local desde migraciones + seed demo |
| `pnpm bootstrap:admin` | Alta del primer administrador |

## Estructura

```
src/app/(public)     web pública (único root layout que puede cargar GA4)
src/app/(booking)    /reservar, /cita/*, /libro-de-reclamaciones (sin trackers)
src/app/admin        panel (sesión + rol + MFA)
src/app/api          reservas, autogestión, formularios y cron
src/features         booking, cms, contact, complaints, privacy, admin
src/lib              env, supabase, auth, security, notifications, seo, analytics
supabase/migrations  esquema, RLS y funciones SQL
tests/{unit,db,e2e}  pruebas
docs/                documentación del proyecto
```

## Documentación

| Documento | Contenido |
|---|---|
| `docs/ARCHITECTURE.md` | Decisiones, modelo de datos y diseño de capacidad de la agenda |
| `docs/DATOS_PENDIENTES.md` | Datos y accesos que debe entregar la clínica |
| `docs/PROGRESS.md` | Avance, pruebas realizadas y siguiente tarea |
| `docs/ACEPTACION.md` | Criterios verificados / pendientes / bloqueados con evidencia |
| `docs/ADMIN_GUIDE.md` | Guía del panel para el personal |
| `docs/DEPLOYMENT.md` | Despliegue en Vercel + Supabase + Resend |
| `docs/OPERATIONS.md` | Operación, respaldos, alertas y runbook de caída de agenda |
| `docs/PRIVACY_REVIEW.md` | Lista de revisión de privacidad (Ley 29733) para la asesoría |
| `docs/GOOGLE_SETUP.md` | Search Console, GA4 y Business Profile |
| `docs/SEO_MAP.md` | Mapa de palabras clave, datos estructurados y calendario editorial |

## Seguridad

Nunca versionar `.env*` (salvo `.env.example`). La clave secreta de Supabase y las de Resend/cron sólo
existen en el servidor. Ver `docs/ARCHITECTURE.md` §3 y §11.
