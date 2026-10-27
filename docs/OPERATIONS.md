# Operación

## 1. Tareas programadas

| Endpoint | Frecuencia (vercel.json) | Hace |
|---|---|---|
| `/api/cron/outbox` | cada 5 min | Envía correos pendientes (hasta 75 por ejecución), con lease, backoff y reintentos |
| `/api/cron/maintenance` | cada 10 min | Expira retenciones y solicitudes vencidas; purga sesiones, tokens y límites antiguos |

Ambos exigen `Authorization: Bearer $CRON_SECRET`. Además existe `/api/cron/revalidate` (no
programado, mismo secreto) para invalidar la caché de contenido y configuración tras editar datos
directamente en la base o restaurar un backup. Además, tras confirmar/cambiar/cancelar una cita se
intenta enviar sus avisos de inmediato (`after()`); el cron es la garantía.

## 2. Monitoreo y alertas (a configurar)

* **Errores de servidor**: Vercel → Observability/Logs. Los logs sólo contienen códigos y nombres de
  operación (`rpc_error`, `outbox_claim_error`…), nunca cuerpos de formularios, tokens ni contactos.
  Si se agrega un servicio de errores (p. ej. Sentry), configurar el saneado de datos antes de activarlo.
* **Uptime**: monitor externo sobre `/` y `/reservar` (p. ej. cada 5 min) con aviso por correo/WhatsApp
  al responsable técnico.
* **Avisos fallidos**: el Inicio del panel muestra el contador; revisar a diario.
* **Jobs**: alerta si `/api/cron/*` deja de ejecutarse o responde ≠ 200 (Vercel Cron logs).
* **Presupuesto**: alertas de gasto en Vercel y Supabase.
* **Credenciales**: calendario de rotación de `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
  y `BOOKING_CODE_PEPPER` (rotar la pimienta invalida códigos de verificación en curso, no las citas).
  Vencimiento del dominio.

## 3. Respaldos y restauración

| Qué | Cómo | Estado |
|---|---|---|
| Base de datos | Backups diarios de Supabase Pro (+ PITR opcional) | Pendiente de contratar |
| Storage (imágenes) | **No incluido** en los backups de base: copia periódica del bucket `public-media` (p. ej. con el protocolo S3 de Supabase hacia un almacenamiento de la clínica) | Pendiente |
| Configuración | Variables de entorno documentadas en un gestor de secretos de la clínica | Pendiente |

**Objetivo propuesto**: RPO ≤ 24 h y RTO ≤ 8 h, sujeto a prueba y aceptación de la clínica. Si perder
hasta un día de agenda no es aceptable, contratar **PITR** y ajustar antes de abrir reservas. Un plan Pro
no garantiza recuperación instantánea.

**Ensayo local realizado** (datos sintéticos): `pg_dump -Fc` de los esquemas `public`, `private` y
`auth` → `pg_restore` en una base nueva → conteos idénticos en citas, contactos, contenido publicado,
outbox, auditoría, sesiones y usuarios; restricciones `EXCLUDE` y 57 políticas RLS presentes. Duración
≈ 1 s con ~500 KB. **Pendiente**: ensayo de restauración en Supabase Pro (proyecto de staging) y del
respaldo de Storage.

Procedimiento de restauración (resumen): restaurar a un **proyecto nuevo** (no sobre producción),
verificar conteos y una reserva de prueba, apuntar Vercel al nuevo proyecto, invocar
`/api/cron/revalidate`, conciliar las citas
registradas manualmente durante la caída (ver §4) y retirar el proyecto anterior.

## 4. Runbook: caída de la agenda

Síntomas: errores en `/reservar`, avisos de error en el panel, cron fallando, Supabase caído.

1. **Detener nuevas reservas en línea**: Panel → Configuración → Modo de reserva = **Desactivado**.
   Si el panel no carga, retirar `SUPABASE_SECRET_KEY` del entorno de Vercel y redesplegar: `/reservar`
   pasa a «Solicitar cita» (el formulario no podrá guardarse mientras la base no responda; quedan
   teléfono y WhatsApp).
2. La web pública **sigue funcionando desde caché** (páginas estáticas/ISR con el último contenido y la
   última configuración válidos: un error de la base no se cachea como «vacío»), con teléfono y WhatsApp.
3. Recepción registra las citas **en papel o en una hoja temporal controlada** (sólo nombre, contacto,
   fecha/hora, profesional, servicio; sin datos clínicos).
4. Al restablecerse: registrar cada cita manual en el panel (origen teléfono/WhatsApp) **antes** de
   reabrir reservas; el sistema rechazará cualquier cruce. Revisar avisos fallidos y reintentarlos.
5. Reabrir reservas (modo anterior) y vigilar el panel durante la primera hora.
6. Registrar el incidente (fecha, duración, causa, citas afectadas) y evaluar si hubo incidente de
   seguridad de datos personales (procedimiento en `PRIVACY_REVIEW.md`).

## 5. Acceso de emergencia (todos los administradores sin MFA)

Con la cuenta de Supabase de la clínica (dueño del proyecto): Dashboard → Authentication → Users →
usuario → eliminar sus factores MFA; la persona vuelve a configurarlos al ingresar. Registrar la acción
fuera del sistema (la auditoría interna no la ve). Mantener al menos **dos** administradores activos.

## 6. Mantenimiento rutinario

* Semanal: avisos fallidos, solicitudes de contacto sin atender, solicitudes pendientes, Search Console.
* Mensual: revisar usuarios activos y roles; retirar accesos de personal que ya no trabaja; actualizar
  dependencias (`pnpm outdated`, `pnpm audit`) en una rama con pruebas.
* Antes de cada feriado: registrarlo en «Feriados y bloqueos» y en Google Business Profile.
* Retención y anonimización de datos según la política aprobada (`PRIVACY_REVIEW.md`): la función
  `admin_anonymize_contact` existe; el job automático de retención queda pendiente de definir plazos.
