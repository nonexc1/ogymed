# Datos pendientes de OGYMED

Ningún dato de esta lista se ha inventado ni cargado en el código. Mientras falten, la web muestra
estados vacíos y en desarrollo se usan datos **explícitamente ficticios** (`is_demo = true`, marcados
«[DEMO]») que nunca se cargan en producción (`supabase/seed.sql` sólo corre en local con `db reset`).

Estado: ⛔ bloquea lanzamiento · ⚠️ bloquea una función concreta · ℹ️ mejora.

## Identidad y datos legales

| Dato | Dónde se carga | Estado | Bloquea |
|---|---|---|---|
| Logo vectorial / manual de marca | Reemplaza la marca tipográfica provisional (`src/components/site/logo.tsx`) | ℹ️ | Identidad final |
| Colores oficiales (si existen) | `src/app/globals.css` (tokens) | ℹ️ | — |
| Razón social y RUC | Panel → Configuración → Datos públicos | ⛔ | Privacidad, términos, libro de reclamaciones, JSON-LD |
| Dominio final y acceso DNS | Vercel + `NEXT_PUBLIC_SITE_URL` | ⛔ | Canonical, sitemap, Search Console, Resend |

## NAP y contacto

| Dato | Dónde | Estado | Bloquea |
|---|---|---|---|
| Dirección exacta y referencia | Configuración → Datos públicos | ⛔ | Contacto, JSON-LD, Business Profile |
| Coordenadas verificadas | Configuración | ⚠️ | Mapa y JSON-LD `geo` |
| Teléfono (E.164) | Configuración | ⛔ | Botón «Llamar», NAP |
| WhatsApp oficial (E.164) | Configuración | ⚠️ | Botón WhatsApp (oculto mientras no exista) |
| Correo público | Configuración | ⚠️ | Contacto |
| Horarios de atención y especiales | Configuración | ⛔ | Contacto, JSON-LD, Business Profile |
| Redes sociales verificadas | Configuración | ℹ️ | Footer, `sameAs` |
| Enlace de Google Maps | Configuración | ℹ️ | «Cómo llegar» |

## Catálogo clínico (requiere aprobación médica)

| Dato | Estado | Bloquea |
|---|---|---|
| Lista de servicios realmente ofrecidos | ⛔ | Páginas de servicio y reservas |
| Por servicio: explicación, a quién se dirige, qué esperar, preparación (revisada por el equipo médico) | ⛔ | Publicación |
| Duración por profesional-servicio, buffers | ⛔ | Agenda real |
| Precios en PEN (sólo si se aprueba publicarlos) | ℹ️ | Mostrar precio |
| Recursos compartidos (consultorios, ecógrafo…) si limitan agenda | ⚠️ | Capacidad real |
| Aseguradoras / convenios | ℹ️ | FAQ, contacto |

Los servicios candidatos del encargo (consulta ginecológica, prevención y controles, ecografía
ginecológica, colposcopia, planificación familiar, menopausia) sólo existen como **borradores demo**
en desarrollo. Obstetricia, fertilidad o ginecología regenerativa no se crean salvo confirmación.

## Profesionales

| Dato | Estado | Bloquea |
|---|---|---|
| Nombres, especialidad | ⛔ | Equipo, agenda |
| CMP y RNE (verificados por administración en el registro oficial) | ⛔ | Publicar perfil |
| Trayectoria respaldada, formación | ⚠️ | Perfil |
| Fotografías autorizadas (derechos de uso confirmados) | ⚠️ | Perfil (se publica sin foto si no hay) |
| Horario semanal, ausencias previstas | ⛔ | Agenda real |
| Quién actúa como revisor médico de contenidos | ⛔ | Publicar servicios y blog |

## Operación de agenda

| Dato | Estado | Bloquea |
|---|---|---|
| Modo de reserva inicial: `off` (solicitud), `reception` (pendiente de confirmación) o `automatic` | ⛔ | Abrir reservas |
| Antelación mínima, horizonte máximo, duración de retención | ⚠️ | Valores por defecto: 120 min, 60 días, 5 min |
| Política de cancelación/reprogramación (plazo en horas, texto) | ⛔ | Autogestión |
| Vencimiento operativo de solicitudes pendientes | ⚠️ | Por defecto 24 h |
| Antelación del recordatorio | ℹ️ | Por defecto 24 h |
| Feriados y cierres especiales | ⚠️ | Disponibilidad correcta |
| Persona responsable de recepción y correo de avisos internos | ⛔ | Avisos a recepción |
| Atención a menores de edad (proceso y consentimiento) | ⚠️ | No se habilita flujo específico hasta definirlo |

## Legal y privacidad (validación por asesoría local)

| Dato | Estado | Bloquea |
|---|---|---|
| Responsable del tratamiento y canal de derechos | ⛔ | Política de privacidad |
| Finalidades, bases, proveedores, transferencias internacionales, retención | ⛔ | Política de privacidad, consentimiento |
| Registro del banco de datos ante la ANPD (si corresponde) | ⛔ | Lanzamiento |
| Textos de términos, cookies y política de citas | ⛔ | Publicación |
| Libro de reclamaciones: campos, plazos y responsable operativo | ⛔ | Activar el formulario (desactivado por defecto) |
| Plazos de retención y anonimización (incl. backups) | ⛔ | Job de retención |

## Cuentas y accesos (configurar por canal seguro, nunca en el repositorio ni en el chat)

| Cuenta | Estado | Para qué |
|---|---|---|
| GitHub (repositorio privado de la clínica) | ⚠️ | Código |
| Vercel Pro (titular la clínica) | ⛔ | Hosting, cron, dominio |
| Supabase Pro (titular la clínica), región elegida tras medir latencia y revisar transferencias | ⛔ | Base de datos, Auth, Storage |
| Resend + dominio de envío (SPF, DKIM, DMARC) | ⛔ | Verificación de correo y avisos |
| SMTP de Supabase Auth (p. ej. SMTP de Resend) | ⛔ | Invitaciones del personal |
| Google Search Console (propiedad de dominio) | ⚠️ | Indexación |
| Google Analytics 4 (propiedad de la clínica) | ℹ️ | Medición (opcional, con consentimiento) |
| Google Business Profile verificado | ⚠️ | SEO local |
| Correo del primer administrador | ⛔ | `pnpm bootstrap:admin` |

## Identidad y fotografías

Detalle por espacio, formatos y enlaces a las fotos generadas: `docs/ASSETS.md`.

| Dato | Estado |
|---|---|
| Logo en vector (se recibió JPG circular coral) y decisión de uso con la paleta ciruela | ⛔ |
| Fotos reales de instalaciones (La clínica) y fachada/acceso (Ubicación) | ⛔ |
| Retratos autorizados de profesionales | ⛔ |
| 4 fotos conceptuales generadas con IA: revisar y subir en Medios | 🟡 |

## Contenido editorial

| Dato | Estado |
|---|---|
| Textos de portada, la clínica, primera visita | ✅ redactados (`supabase/content/contenido-inicial.sql`); «Primera visita» espera documentos/llegada `[COMPLETAR]` y revisión médica |
| Servicios: confirmar cuáles de los 6 candidatos se ofrecen y aprobarlos (revisor médico) | ⛔ |
| Artículos del blog (6 redactados con fuentes): revisor médico con perfil publicado | ⛔ |
| Textos legales: borradores con campos `[COMPLETAR]` (razón social, RUC, domicilio, correo de privacidad, plazos, región de alojamiento, menores, banco de datos) | ⛔ |
| Preguntas frecuentes operativas reales | ✅ 9 publicadas (funcionamiento verificado en el código); añadir pagos/seguros cuando se confirmen |
| Fotografías reales de instalaciones con autorización | ⚠️ |
| Accesibilidad física de la sede (ascensor, rampas, estacionamiento) | ℹ️ |
| Testimonios: sólo si existen y hay autorización escrita | ℹ️ (no se muestran) |
| Calendario editorial: revisor por tema (ver `SEO_MAP.md`) | ℹ️ |
