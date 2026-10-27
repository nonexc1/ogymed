# Progreso de OGYMED

Última actualización: 2026-10-27 · Rama: `claude/brave-keller-l37tjb`

## Estado por fase

| Fase | Estado | Nota |
|---|---|---|
| 1. Auditoría, decisiones, datos faltantes, esquema y sistema visual | ✅ Terminada | Repo vacío inicializado; `ARCHITECTURE.md`, `DATOS_PENDIENTES.md`; identidad provisional con contrastes verificados |
| 2. Web pública | ✅ Funcional | Todas las páginas del encargo; contenido desde el CMS; estados vacíos sin placeholders en producción |
| 3. Supabase, Auth/RLS, admin y CMS | ✅ Funcional | 5 migraciones, RLS denegar por defecto, MFA, panel completo |
| 4. Agenda y reserva transaccional | ✅ Funcional | Holds, verificación, idempotencia, autogestión, outbox, cron; probado con concurrencia real |
| 5. SEO local, consentimiento, analítica | ✅ Funcional | GA4 por lista permitida verificado por interceptación de red; guías Google y mapa SEO |
| 6. QA y preparación de despliegue | ✅ Local / ⛔ producción | Todas las pruebas en verde; producción bloqueada por datos, textos legales y cuentas |

## Implementado

**Plataforma**: Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3 estricto, Tailwind 4, Radix, Zod 4,
React Hook Form, supabase-js 2.118 + @supabase/ssr 0.12, Resend 6, pnpm 10.28, Node 22. Tres root
layouts (público / reservas / panel) para aislar la analítica.

**Base de datos** (`supabase/migrations`): personal y roles con helpers `aal2`; catálogo, horarios,
excepciones y recursos; CMS con snapshots publicados, revisión médica, historial, restauración y
redirecciones sin bucles; agenda con `EXCLUDE` sobre intervalos con buffers (holds y citas comparten
mecanismo), bloqueo transaccional por profesional/recurso, transiciones validadas por trigger, versión
de cita; sesiones de reserva, verificación HMAC, tokens de autogestión de un solo uso, outbox con lease
y backoff, límites de frecuencia, contacto, libro de reclamaciones, derechos ARCO, auditoría inmutable,
reportes y exportación minimizada; bucket de imágenes con políticas.

**Web pública**: portada, la clínica, servicios (índice/detalle con CTA que preselecciona), equipo
(índice/perfil), primera visita, preguntas frecuentes, blog (índice/artículo con autor, revisor y
referencias), contacto (mapa bajo demanda, formulario), privacidad (con formulario de derechos),
cookies (tabla real), términos, política de citas, 404, errores. Header con WhatsApp liviano, barra
móvil, footer con NAP y acceso discreto del personal. JSON-LD sólo con datos reales.

**Reservas**: `/reservar` (servicio → profesional o primera disponibilidad → fecha/hora → contacto →
código → revisión → resultado) con retención y cuenta regresiva del servidor; «Solicitar cita» si la
agenda no está lista; `/cita/acceso` (token en fragmento, canje por POST) y `/cita/gestionar` (cancelar
y reprogramar con política de plazo, reenvío genérico de enlace).

**Panel**: login + MFA TOTP, invitaciones, dashboard real, agenda día/semana/mes/lista, ficha de cita
(estados, reprogramación, nota, trazabilidad, avisos con reintento), alta manual por teléfono/WhatsApp,
profesionales (credenciales, servicios/duración/buffers, horario semanal), feriados/bloqueos/recursos,
servicios, páginas, FAQ, blog, medios (WebP sin EXIF), redirecciones, configuración pública/privada,
usuarios (roles, revisor médico, restablecer MFA), solicitudes de contacto, reclamaciones y derechos,
auditoría, reportes y exportación CSV auditada, previsualización.

**Documentos**: `README.md`, `ARCHITECTURE.md`, `DATOS_PENDIENTES.md`, `SEO_MAP.md`,
`GOOGLE_SETUP.md`, `ADMIN_GUIDE.md`, `PRIVACY_REVIEW.md`, `DEPLOYMENT.md`, `OPERATIONS.md`,
`ACEPTACION.md`, `PROGRESS.md`.

## Pruebas realizadas (comandos reales)

| Comando | Resultado |
|---|---|
| `pnpm lint` / `pnpm typecheck` | Sin errores |
| `pnpm test` | 21 pruebas unitarias OK |
| `pnpm db:reset` + `pnpm test:db` | 40 pruebas SQL OK (repetida 12+ veces seguidas) |
| `pnpm build` | OK (también en modo producción con `APP_ENV=production SITE_INDEXING=on`) |
| `pnpm test:e2e` | 16 pruebas OK (13 escritorio + 3 móvil), incl. axe y teclado |
| `pnpm audit --prod` | Sin vulnerabilidades conocidas |
| Lighthouse 13.5 móvil (local) | Perf 91–94, A11y 100, BP 100 (detalle en `ACEPTACION.md`) |
| `pg_dump`/`pg_restore` local | Ensayo de respaldo con datos sintéticos OK |

## Problemas encontrados y corregidos durante las pruebas

* **Deadlock entre reservas concurrentes** en la restricción `EXCLUDE` (aparecía ~1 de cada 6
  ejecuciones): se serializa la adquisición por profesional/recurso con `pg_advisory_xact_lock`; prueba
  de estrés de 12 conexiones añadida.
* Trigger `UPDATE OF` que no se disparaba con columnas fijadas por un trigger BEFORE (los recursos no se
  liberaban al cancelar): ahora se compara OLD/NEW.
* Correo con token distinto en cada reintento rompía la idempotencia del proveedor: token derivado por HMAC.
* Formularios con `Referrer-Policy: no-referrer` envían `Origin: null`: se valida con `Sec-Fetch-Site`.
* Caché de contenido reutilizable entre modos demo/producción: el filtro forma parte de la clave.
* Errores momentáneos de la base cacheados como «vacío»: ahora se conserva el último valor válido.
* Avisos de una cita nueva detrás de una cola acumulada: se procesan primero los de esa cita.
* Accesibilidad (axe): contraste, etiqueta en el nombre del logo, tablas desplazables enfocables.
* Zod JIT bloqueado por la CSP: `jitless` en lugar de relajar la CSP.
* Revisión visual con capturas (escritorio y móvil, build de producción): la tabla «Hoy» del inicio del
  panel se recortaba entre 1280 y 1535 px (ahora las dos tarjetas se apilan hasta 1536 px) y el selector
  de profesional al reprogramar truncaba el nombre (ahora ocupa media fila).

## Bloqueos concretos (necesito de OGYMED)

1. Datos de `DATOS_PENDIENTES.md`: razón social/RUC, dirección y coordenadas, teléfono y WhatsApp,
   horarios, catálogo de servicios aprobado con textos revisados, profesionales con CMP/RNE, fotos
   autorizadas, duraciones, política de cancelación, revisor médico.
2. Textos legales validados por asesoría (privacidad, cookies, términos, política de citas, libro de
   reclamaciones) y decisiones de `PRIVACY_REVIEW.md` (incluida la región/transferencia internacional).
3. Cuentas a nombre de la clínica (por canal seguro, nunca en el chat ni en el repositorio): dominio y
   DNS, GitHub, Vercel Pro, Supabase Pro, Resend, Google (Search Console, GA4 opcional, Business Profile).
4. Correo del primer administrador y de recepción para avisos.

## Riesgos de lanzamiento

* Abrir reservas sin agenda real validada → mantener `booking_mode = off` hasta el ensayo completo.
* Correo transaccional sin dominio verificado → la verificación por código no funcionaría; hoy la web
  cae a «Solicitar cita» si no hay correo configurado.
* Región de alojamiento fuera de Perú sin revisión legal.
* RPO de 24 h con backups diarios: si no es aceptable, contratar PITR.
* El libro de reclamaciones virtual permanece desactivado hasta validar campos y plazos.

## Siguiente tarea

Con los datos y cuentas: crear proyectos Supabase (staging y producción), configurar Resend + DNS,
desplegar staging en Vercel, ensayar con datos sintéticos (incluida restauración de backup) y cargar el
contenido real para revisión médica y legal. Sin ellos, posibles mejoras: job de retención con plazos
configurables, CSP con nonces en rutas dinámicas, adaptador de WhatsApp oficial (fase opcional).
