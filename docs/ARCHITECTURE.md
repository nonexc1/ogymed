# Arquitectura de OGYMED

Documento vivo. Las decisiones son propuestas técnicas para OGYMED, no características inferidas de la
clínica. Las secciones marcadas «Verificado» tienen pruebas automáticas (ver `ACEPTACION.md`).

## 1. Decisiones principales

| Tema | Decisión | Motivo |
|---|---|---|
| Aplicación | Un único Next.js 16.4 (App Router) + React 19.3 + TypeScript 6.0 estricto | Web pública, reservas y administración en un proyecto |
| Paquetes | pnpm 10.28, Node 22 LTS, versiones fijadas y lockfile | Builds reproducibles. TypeScript 7 (port nativo) se descartó porque Next aún usa la API JS |
| UI | Tailwind 4 + componentes estilo shadcn/ui (Radix) + Lucide | Accesibles y propios, sin dependencia de un kit visual cerrado |
| Formularios | React Hook Form + Zod 4; los mismos esquemas validan en servidor | Validación consistente |
| Datos | Supabase PostgreSQL 17, migraciones SQL versionadas en `supabase/migrations` | Transacciones y restricciones de exclusión para la agenda |
| Acceso a datos | `supabase-js` + `@supabase/ssr`; RPC SQL para agenda | Una sola capa de persistencia y de autenticación (sin Prisma) |
| Auth | Supabase Auth sólo para personal, invitación + contraseña + TOTP (MFA) | Pacientes no tienen cuenta |
| Correo | Resend (adaptador); en desarrollo, buzón local `.dev-mail/` | Sin credenciales nunca se finge un envío |
| Trabajos | Vercel Cron → endpoints protegidos con `CRON_SECRET` → outbox en PostgreSQL | Reintentos persistentes, sin depender de `setTimeout` |
| Analítica | GA4 directo (sin GTM), sólo tras consentimiento y en rutas permitidas | Minimiza fugas de datos de salud |

## 2. Estructura

```
src/
  app/
    (public)/        Root layout público: cabecera, footer, banner de cookies, GA4 condicionado
    (booking)/       Root layout SIN trackers: /reservar, /cita/*  (noindex, no-store)
    admin/           Root layout del panel (noindex, sesión + rol + MFA)
    api/             Route handlers: reservas, autogestión, contacto, cron
    global-not-found.tsx, sitemap.ts, robots.ts
  components/        ui/ (primitivas), site/ (público)
  features/booking   Cliente del flujo de reserva, esquemas
  features/cms       Lectura de contenido publicado, render de Markdown sanitizado
  lib/               env, supabase (server/browser/admin), auth, notifications, seo, analytics, security
supabase/migrations  Esquema, RLS y funciones
tests/unit|db|e2e    Vitest (unidad y SQL real) y Playwright (+ axe)
```

**Tres root layouts separados.** Navegar entre ellos fuerza recarga completa, por lo que un script de
GA4 cargado en la web pública nunca persiste en `/reservar`, `/cita/*` ni `/admin`. Además, dentro de
la web pública los enlaces hacia rutas no permitidas para analítica usan `<a>` (recarga) y no
`next/link` (ver §8).

## 3. Modelo de acceso a datos

| Quién | Credencial | Qué puede |
|---|---|---|
| Visitante (servidor Next, páginas públicas) | Publishable key → rol `anon` | `SELECT` sobre `published_content`, `clinic_settings_public`, `redirects` y `public_offerings()`. Nada más (verificado). |
| Flujo de reserva/autogestión/contacto | Secret key → `service_role`, **sólo en route handlers** | Ejecutar funciones `booking_*`, `manage_*`, `outbox_*`, `jobs_*`, `rate_limit_hit`. Sin privilegios directos sobre tablas (revocados y verificado). |
| Personal (panel) | Sesión Supabase en cookies → rol `authenticated` | RLS por rol + MFA (`aal2`) para datos de citas; escrituras sensibles vía RPC que vuelven a comprobar rol y MFA. |
| Invitaciones de personal | Secret key sólo para `auth.admin.inviteUserByEmail`, tras comprobar admin+MFA con la sesión | — |

* Supabase concede por defecto todo a `anon`/`authenticated` en `public`: la migración 0001 revoca
  los privilegios por defecto y cada tabla concede sólo lo necesario. Todas las tablas tienen RLS.
* Datos que no deben ser accesibles por la Data API (sesiones de reserva, tokens, límites) viven en el
  esquema `private`, no expuesto.
* Funciones privilegiadas: `SECURITY DEFINER`, `search_path = ''`, nombres calificados y `EXECUTE`
  concedido explícitamente a un único rol.
* La clave secreta elude RLS; por eso **no se usa para leer tablas**: todo pasa por funciones que
  validan sesión, propiedad y estado.

## 4. Roles del personal

| Rol | Puede | No puede |
|---|---|---|
| admin | Todo; usuarios, configuración, publicar perfiles profesionales, auditoría, exportaciones | — |
| reception | Citas, contactos mínimos, disponibilidad, bloqueos, solicitudes de contacto | Usuarios, configuración, auditoría, reclamaciones |
| professional | Su propia agenda y los contactos de sus citas; marcar asistencia; revisar contenido si está habilitado | Agenda ajena |
| editor | Contenido, medios, SEO, redirecciones | Citas, contactos |

Roles en `staff_roles`, escribibles sólo por `admin_upsert_staff` (admin + MFA, auditado, impide
quedarse sin administradores). No hay registro público (`enable_signup = false`). MFA TOTP exigido
por la base de datos (`auth.jwt()->>'aal' = 'aal2'`) para datos de citas y operaciones de admin, y por
la aplicación para entrar al panel.

## 5. Agenda: diseño de capacidad (documentado antes de implementarlo)

**Un único mecanismo de bloqueo.** Retenciones y citas son filas de `appointments`:

```
status ∈ hold | pending_confirmation | confirmed | cancelled | completed | no_show | expired
occupied        = [inicio − buffer_antes, fin + buffer_después)    ← fijado por trigger
blocks_capacity = status ∈ {hold, pending_confirmation, confirmed}  ← fijado por trigger
EXCLUDE USING gist (doctor_id WITH =, occupied WITH &&) WHERE (blocks_capacity)
```

* Previene **solapes de intervalos**, no sólo horas de inicio iguales, incluso entre transacciones
  concurrentes (la segunda espera a la primera y recibe `exclusion_violation` → «horario tomado»).
* Holds y citas comparten la restricción: es imposible que una retención y una cita se crucen.
* Recursos compartidos opcionales: `appointment_resource_claims` se **deriva por trigger** de la cita
  (mismo `occupied` y `blocks_capacity`) y tiene su propia `EXCLUDE (resource_id, occupied)`. La fuente
  de verdad sigue siendo la cita.
* El predicado no usa `now()`. Los holds vencidos siguen bloqueando hasta marcarse `expired`, lo que
  ocurre (a) en el job de mantenimiento y (b) **dentro de la transacción que adquiere** un intervalo
  que los solape (`private.expire_stale`).
* La disponibilidad (`private.compute_slots`) se calcula en SQL a partir de reglas semanales
  (`schedule_rules`, hora local `America/Lima`), duración/buffers por profesional-servicio,
  excepciones (feriados de sede, ausencias, bloqueos), citas activas y recursos. Los instantes se
  guardan en `timestamptz` (UTC) y se muestran como «Hora de Lima».
* El servidor determina duración, fin, buffers y estado; el cliente sólo envía servicio, profesional
  e inicio elegidos de la lista devuelta por el servidor.
* Reprogramar actualiza la **misma fila** en una sentencia: si el destino choca, la sentencia falla y
  la cita original queda intacta; si funciona, el origen se libera en el mismo instante.
* `version` se incrementa con cada cambio de horario/estado; los recordatorios de versiones
  anteriores se marcan obsoletos.

Transiciones permitidas (trigger): `hold → pending_confirmation | confirmed | expired`;
`pending_confirmation → confirmed | cancelled | expired`; `confirmed → cancelled | completed | no_show`;
`completed ↔ no_show`; `expired → confirmed | pending_confirmation` y `cancelled → confirmed` sólo por
personal, revalidando horario y capacidad.

## 6. Flujo de reserva web

1. Servicio → profesional o «primera disponibilidad» → fecha/hora (lista de horarios desde la BD).
2. Al elegir horario: `POST /api/booking/hold` crea una sesión de reserva (cookie httpOnly con token
   aleatorio; en BD sólo su SHA-256) y una retención de `hold_minutes` (5 por defecto). Se muestra la
   cuenta regresiva con la expiración real del servidor.
3. Contacto mínimo (nombre, email, teléfono opcional) + consentimiento de privacidad (obligatorio,
   versión registrada) + comercial (opcional, desmarcado).
4. Verificación del email con código de 6 dígitos (HMAC con pimienta del servidor; 10 min; 5
   intentos; 5 envíos por sesión).
5. Revisar y confirmar con clave de idempotencia. Si la red falla, el cliente consulta
   `/api/booking/result` con la misma clave antes de reintentar.
6. Resultado: «Cita confirmada» (modo automático) o «Solicitud recibida, pendiente de confirmación»
   (modo recepción, con vencimiento operativo). En modo `off` no hay agenda: se ofrece «Solicitar cita»
   (formulario) y WhatsApp, explicando que recepción confirmará.

La cita, el consentimiento, el evento de auditoría y los avisos de outbox se escriben en **una
transacción**. Un fallo de correo no revierte la cita: queda como notificación pendiente/fallida
visible en el panel, con reintento.

## 7. Autogestión sin cuenta

* El correo incluye `/cita/acceso?t=<token>`; el token (32 bytes aleatorios) se guarda como hash, es de
  un solo uso y vence (72 h por defecto). El worker de outbox emite un token nuevo en cada envío: el
  token en claro nunca se almacena.
* La página de acceso **no canjea por GET**: retira el token de la URL (`history.replaceState`), envía
  `Referrer-Policy: no-referrer` y muestra un botón que lo canjea por `POST` → cookie de sesión de
  gestión (30 min) → redirección 303 a `/cita/gestionar`. Un escáner de correo que visite el enlace no
  consume el token ni modifica nada.
* Cancelar/reprogramar: `POST` con confirmación explícita; política de plazo editable; fuera de plazo
  se deriva a recepción.
* Enlace vencido: formulario de reenvío con respuesta genérica (no revela si el email existe).

## 8. Analítica y consentimiento

* Banner con «Aceptar», «Rechazar» y «Configurar» de igual peso; analítica desactivada por defecto.
* GA4 sólo se carga en el root layout público, tras consentimiento, si existe ID configurado y
  únicamente en la lista permitida de rutas generales (`/`, `/la-clinica`, `/servicios`, `/equipo`,
  `/primera-visita`, `/preguntas-frecuentes`, `/contacto`, `/blog`). Nunca en servicios concretos,
  artículos, perfiles, reservas, autogestión, reclamaciones ni admin.
* `send_page_view: false`; page_view manual con `page_location` = origen + ruta permitida (sin query),
  `page_title` genérico y `page_referrer` vacío. Señales de Google y personalización de anuncios
  desactivadas. La medición mejorada debe desactivarse también en la propiedad (ver `GOOGLE_SETUP.md`).
* Eventos: `click_book`, `click_whatsapp`, `click_call`, `click_directions` con un único parámetro
  `position` de una lista cerrada.

## 9. CMS

* Copias de trabajo (`services`, `doctors`, `pages`, `posts`, `faqs`) sólo para personal.
* Publicar materializa un **snapshot** en `published_content` (única superficie de contenido legible
  por `anon`). Editar algo publicado deja el snapshot en línea y devuelve la copia a `draft`.
* Estados: `draft → medical_review → published → archived`. Servicios, artículos y páginas marcadas
  exigen revisión médica por un usuario habilitado (`can_review_medical`); los artículos exigen
  profesional revisor con perfil publicado. Los perfiles profesionales sólo los publica admin con
  CMP/RNE verificados (cambiar el CMP anula la verificación).
* Historial: cada edición guarda la versión anterior en `content_revisions`; restaurar la devuelve a
  borrador. Imágenes: derechos de uso confirmados y texto alternativo obligatorios para publicar.
* Cambiar un slug publicado crea una 301 automática, aplana cadenas y elimina la redirección que
  tuviera como origen la nueva ruta. Un trigger impide ciclos (también en redirecciones manuales).
* Markdown renderizado en servidor y sanitizado con lista blanca (sin scripts, estilos ni iframes).

## 10. Outbox

`notification_outbox` con `dedupe_key` única, `status` (pending, sending, sent, failed, skipped,
cancelled), lease (`locked_until`, `locked_by`), reclamo con `FOR UPDATE SKIP LOCKED`, backoff
exponencial (máx. 6 h) y `max_attempts`. Al enviar se consulta `outbox_context`: si la cita cambió de
versión o un recordatorio ya no corresponde a una cita confirmada, se marca `skipped`. Resend recibe
la `dedupe_key` como clave de idempotencia. WhatsApp automático queda como adaptador futuro: sin
credenciales el panel muestra «No configurado».

## 11. Seguridad transversal

* Variables de entorno validadas con Zod; secretos sólo en servidor (`server-only`).
* Route handlers: comprobación de `Origin`, validación Zod, rate limiting persistente en PostgreSQL
  por IP hasheada, honeypot en formularios públicos, respuestas genéricas sin enumeración.
* Cookies `HttpOnly`, `Secure` (producción), `SameSite=Lax`/`Strict`, rutas acotadas.
* Cabeceras: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `frame-ancestors 'none'`, HSTS en producción; `Cache-Control: no-store` en rutas privadas.
* Logs con IDs técnicos y códigos de error, nunca cuerpos de formularios, tokens ni contactos.
* Auditoría (`audit_log`) de sólo inserción (triggers impiden UPDATE/DELETE/TRUNCATE).
