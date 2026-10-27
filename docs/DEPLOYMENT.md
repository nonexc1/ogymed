# Despliegue

Arquitectura de producción propuesta: **GitHub privado → Vercel Pro (Next.js) + Supabase Pro
(PostgreSQL/Auth/Storage) + Resend (correo)**, todas las cuentas a nombre de la clínica. Nada de esto
está contratado todavía; ver costos orientativos en el encargo y `DATOS_PENDIENTES.md`. No comprar
dominio ni servicios sin autorización de OGYMED.

## 0. Requisitos previos (bloqueantes)

* Datos clínicos y legales aprobados (servicios, profesionales verificados, textos legales validados).
* Dominio final de la clínica con acceso a DNS (verificar disponibilidad; no asumir `.com`/`.pe` libres).
* Pruebas críticas aprobadas (`ACEPTACION.md`), incluido un envío real de correo a cuentas de prueba.

## 1. Entornos

| Entorno | Supabase | Vercel | Datos | Indexación |
|---|---|---|---|---|
| Local | `supabase start` | `pnpm dev` | Seed demo ficticio | No |
| Preview/staging | **Proyecto Supabase separado** | Deploy Preview | Sólo sintéticos | No (`X-Robots-Tag: noindex`) |
| Producción | Proyecto Supabase de producción | Producción | Reales | Sí (`SITE_INDEXING=on`) |

**Nunca conectar previews a la base de producción** (pacientes reales). En Vercel, definir las
variables por entorno (Production / Preview) apuntando a proyectos Supabase distintos.

## 2. Supabase (producción)

1. Crear el proyecto (plan Pro) en la región elegida **tras medir latencia desde Lima** (p. ej. São
   Paulo vs. Norteamérica) y **tras la revisión de transferencia internacional** (`PRIVACY_REVIEW.md`).
   La región de Vercel Functions debe ser la más cercana a esa región de base de datos.
2. Aplicar migraciones (sin seed):
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push        # aplica supabase/migrations; NO ejecuta seed.sql
   ```
3. **Auth** (Dashboard → Authentication):
   * Desactivar registros públicos («Allow new users to sign up» = off). Mantener el proveedor Email
     habilitado (necesario para iniciar sesión).
   * MFA → TOTP habilitado.
   * URL Configuration: Site URL = `https://<dominio>`; Redirect URLs = `https://<dominio>/admin/confirmar`.
   * Email Templates: copiar `supabase/templates/invite.html` y `recovery.html` (enlaces con `#token_hash`).
   * SMTP personalizado (p. ej. SMTP de Resend) para que lleguen invitaciones y recuperaciones.
   * Política de contraseñas: longitud ≥ 12 y requisitos de mayúsculas/minúsculas/números.
4. **Storage**: el bucket `public-media` lo crea la migración (público, 10 MB, sólo imágenes).
5. **API keys**: usar la *publishable key* (pública) y una *secret key* (servidor). Rotar la secret key
   si alguna vez se expone.
6. **Backups**: Pro incluye backups diarios. Evaluar **PITR** si perder hasta 24 h de agenda no es
   aceptable (ver `OPERATIONS.md`). Storage necesita respaldo separado.

## 3. Resend

1. Agregar el dominio de envío (p. ej. `citas.<dominio>` o el dominio raíz) y crear en el DNS los
   registros que Resend indique (SPF, DKIM) y una política **DMARC** (empezar con `p=none` + reportes y
   endurecer luego).
2. **Desactivar seguimiento de aperturas y clics** en el dominio (privacidad).
3. Crear una API key con permiso de envío sólo para ese dominio.
4. Probar envío real **sólo a cuentas de prueba autorizadas** antes de abrir reservas.

## 4. Vercel

1. Importar el repositorio de GitHub (privado, cuenta de la clínica). Framework: Next.js. Node 22.
2. Variables de entorno (ver `.env.example`):

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio>` | URL de staging |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Proyecto prod | Proyecto staging |
| `SUPABASE_SECRET_KEY` | secreta prod | secreta staging |
| `BOOKING_CODE_PEPPER` | aleatoria ≥ 32 | distinta |
| `CRON_SECRET` | aleatoria ≥ 32 | distinta |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | prod | staging (sólo a cuentas de prueba) |
| `SITE_INDEXING` | `on` | `off` |

   `EMAIL_TRANSPORT=dev-file` está **prohibido en producción** (el build falla a propósito).
3. **Cron**: `vercel.json` define `/api/cron/outbox` (cada 5 min) y `/api/cron/maintenance` (cada 10
   min). Vercel envía `Authorization: Bearer $CRON_SECRET`. Sin `CRON_SECRET` los endpoints responden 401.
4. **Dominio**: agregar `dominio` y `www.dominio`; elegir uno como canónico y redirigir el otro con 301
   (configuración de dominios de Vercel). HTTPS automático.
5. **Región de funciones** cercana a la base de datos.
6. **Protección de previews** (Vercel Authentication) para que staging no sea público.

## 5. Arranque de producción

1. Desplegar con `booking_mode = off` (por defecto): la web muestra «Solicitar cita».
2. `pnpm bootstrap:admin --email <admin> --name "<nombre>"` con las variables de producción en el
   entorno (una sola vez; después se invita desde el panel).
3. Cargar configuración pública (NAP, horarios), textos legales validados y publicarlos.
4. Cargar profesionales (CMP/RNE verificados), servicios aprobados y revisados, horarios y feriados.
5. Correo de recepción para avisos internos. Probar un envío real.
6. Ensayo completo con datos sintéticos en staging; luego activar `reception` o `automatic`.
7. Search Console, GA4 (opcional) y Business Profile: `GOOGLE_SETUP.md`.

## 6. Migraciones y rollback

* Cada cambio de esquema es una migración nueva en `supabase/migrations` (nunca editar una ya aplicada
  en producción). Revisar en PR cambios destructivos (`drop`, `alter type`, cambios de RLS).
* Aplicar primero en staging (`supabase db push` al proyecto staging), correr `pnpm test:db` contra un
  entorno equivalente y las pruebas e2e.
* Rollback: preferir migraciones **compatibles hacia atrás** (añadir antes de quitar; la versión anterior
  de la app debe seguir funcionando con el esquema nuevo). Para revertir código basta con el redeploy de
  Vercel a la versión anterior; para revertir esquema, una migración inversa probada en staging o, en
  último caso, restauración de backup (ver `OPERATIONS.md`).

## 7. Verificaciones post-despliegue

* `https://<dominio>/robots.txt` permite el sitio y enlaza el sitemap; `/sitemap.xml` sólo con páginas
  publicadas; páginas públicas sin `noindex`; `/admin`, `/reservar`, `/cita/*` con `noindex` y `no-store`.
* Cabeceras: CSP, HSTS, `X-Frame-Options: DENY`.
* Cron: en Vercel → Logs, ejecuciones 200 de `/api/cron/*`.
* Reserva de prueba de punta a punta con correo de prueba; cancelarla después.
