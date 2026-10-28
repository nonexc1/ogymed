# Guía del panel de OGYMED

Panel: `https://<dominio>/admin` (enlace discreto «Acceso del personal» en el pie de página).
Todas las horas se muestran en **hora de Lima**.

## 1. Acceso

* **No hay registro público.** Una persona administradora invita desde *Usuarios*.
* La invitación llega por correo → «Activar acceso al panel» → «Continuar» → definir contraseña
  (mínimo 12 caracteres con mayúsculas, minúsculas y números) → configurar **verificación en dos
  pasos (MFA)** escaneando el QR con una aplicación de autenticación.
* En cada ingreso: correo + contraseña + código de 6 dígitos de la aplicación.
* ¿Olvidaste la contraseña? «Olvidé mi contraseña» en el inicio de sesión.
* ¿Perdiste el teléfono con la aplicación? Pide a **otra** persona administradora «Restablecer MFA»
  en *Usuarios*; en tu próximo ingreso volverás a configurarlo. Queda registrado en la auditoría.
* **Si se pierden todos los administradores con MFA**: ver `OPERATIONS.md` §5 (procedimiento de
  emergencia con la cuenta de Supabase de la clínica).

## 2. Roles

| Rol | Ve y hace |
|---|---|
| Administración | Todo, incluidos usuarios, configuración, publicar perfiles, auditoría, reclamaciones y exportaciones |
| Recepción | Agenda, citas, contactos, disponibilidad (feriados/bloqueos), solicitudes de contacto, reportes |
| Profesional | Su propia agenda y los contactos de sus citas; marcar asistencia. Si está habilitado como revisor médico, aprueba contenidos |
| Editorial | Contenido, medios, SEO y redirecciones. No ve citas ni pacientes |

La opción **«Puede aprobar la revisión médica»** se habilita por persona (normalmente profesionales).

## 3. Agenda y citas

* **Agenda**: vistas Día, Semana, Mes y Lista; filtros por profesional y estado.
* **Nueva cita** (teléfono, WhatsApp, presencial): elegir servicio, profesional (o cualquiera) y fecha →
  «Ver horarios disponibles» → elegir hora → datos mínimos (nombre y teléfono o correo) → origen →
  estado inicial (confirmada o pendiente) → registrar. Usa **las mismas reglas que la web**: si alguien
  reserva ese horario en línea al mismo tiempo, sólo una de las dos operaciones se registra y la otra
  recibe «horario ocupado».
* **WhatsApp**: el botón de la web sólo abre una conversación con un mensaje genérico. **Un mensaje no
  crea ni confirma una cita**: recepción la registra aquí con origen «WhatsApp». No pegar en el panel
  conversaciones ni datos clínicos.
* **Ficha de cita**: cambiar estado (confirmar, cancelar con motivo, atendida, no asistió), reprogramar
  (el horario nuevo se toma y el anterior se libera en una sola operación; si falla, la cita no cambia),
  nota administrativa (**nunca información clínica**), trazabilidad completa y avisos de correo.
* **Solicitudes pendientes** (modo «con confirmación de recepción»): confirmarlas antes de su vencimiento
  operativo; si vencen, se liberan y la paciente recibe un aviso.
* **Citas vencidas o canceladas** pueden reactivarse sólo si el horario sigue libre (se revalida).
* **Avisos fallidos** (Agenda → enlace desde Inicio): un fallo de correo nunca anula la cita. Revisar el
  motivo y «Reintentar». El WhatsApp automático figura como **«No configurado»**.

## 4. Disponibilidad

* **Profesionales → [persona]**: servicios que atiende con **duración** y **buffers** (tiempo antes/después),
  si es reservable en la web, y **horario semanal** por bloques (los descansos son bloques separados).
* **Feriados y bloqueos**: feriados de sede, ausencias y bloqueos puntuales. Registrar uno **no cancela**
  citas ya existentes en ese periodo: revisarlas en la agenda.
* **Recursos compartidos** (opcional): consultorios o equipos que limitan citas simultáneas entre
  profesionales; se vinculan a los servicios que los usan.
* **Configuración → Parámetros de agenda**: retención (5 min por defecto), antelación mínima, horizonte,
  vencimiento de solicitudes, plazo de cambios en línea, recordatorio y vigencia del enlace de gestión.
* **Configuración → Modo de reserva web**: *Desactivado* («Solicitar cita»), *Con confirmación de
  recepción* o *Automático*. No activar reservas en línea sin agenda real validada.

## 5. Contenido

Estados: **Borrador → En revisión médica → Publicado → Archivado**.

* Editar algo publicado lo deja en **borrador** con la versión anterior **todavía en línea** hasta volver a
  publicar.
* **Servicios, artículos y «Primera visita»** requieren revisión médica: Editorial los envía a revisión y
  un revisor habilitado los aprueba y publica. Cualquier cambio posterior exige nueva aprobación.
* **Perfiles profesionales**: sólo Administración los publica y sólo con **CMP/RNE verificados** en el
  registro oficial (cambiar el número anula la verificación).
* **Historial**: cada edición guarda la versión anterior; «Restaurar» la devuelve como borrador.
* **Vista previa**: «Previsualizar borrador» (sólo personal, no indexable).
* **Textos legales**: deben venir validados por la asesoría; actualizar la «versión del documento» en cada
  cambio sustancial (queda registrada en cada consentimiento).
* **Medios**: sólo fotografías reales con autorización; texto alternativo obligatorio para publicar;
  marcar «derechos confirmados». Máximo 4 MB; se convierten a WebP y se eliminan metadatos (GPS).
* **Slugs y redirecciones**: cambiar el slug de algo publicado crea una redirección 301 automática al
  republicar. *Redirecciones* permite crear o borrar redirecciones manuales en `/servicios`, `/equipo` y
  `/blog`; el sistema impide bucles.
* No inventar estudios, testimonios, años de experiencia ni promesas de resultados. No publicar páginas
  vacías para aparentar amplitud.
* **Campos `[COMPLETAR: …]`**: marcan datos que sólo OGYMED puede aportar. La base **impide publicar**
  cualquier texto que conserve `[COMPLETAR` (también el aviso de «borrador legal», que se borra cuando la
  asesoría valida el texto).
* **«Actualizar la web ahora»** (Contenido, arriba a la derecha): fuerza que la web pública relea lo
  publicado. Sólo hace falta tras cargar contenido directamente en la base (p. ej. el contenido inicial);
  publicar desde el panel ya actualiza la web.

### Fotografías e «Imagen principal»

Cada página tiene **Imagen principal** (Contenido → página). Además de usarse al compartir en redes, se
muestra en el diseño: Portada → hero; Servicios (índice) → sección de servicios de la portada; La
clínica → cabecera y banda de la portada; Primera visita → «Tu cita, paso a paso»; Contacto → bloque de
ubicación si no hay mapa. Subir antes la foto en **Medios** (derechos y texto alternativo). Lista de fotos
y formatos: `docs/ASSETS.md`. **Vista de demostración** (botón en Contenido): composición completa con
datos ficticios y huecos rotulados; no publica nada.

### Contenido inicial (una sola vez, al lanzar)

`supabase/content/contenido-inicial.sql` carga textos reales sin datos inventados. Pegarlo en Supabase →
SQL Editor → Run; después, Contenido → «Actualizar la web ahora». No duplica nada si se repite y respeta
lo ya escrito en el panel. Resultado:

| Qué | Estado tras el script | Qué hacer |
|---|---|---|
| Portada, La clínica, Contacto, Preguntas frecuentes (+9 preguntas), índices de Servicios/Equipo/Blog | Publicado | Revisar y ajustar el tono si se desea |
| 6 servicios candidatos | En revisión médica | Un **revisor médico** aprueba sólo los que OGYMED ofrece; el resto → Archivar |
| «Tu primera visita» | En revisión médica | Completar documentos y llegada (`[COMPLETAR]`) y aprobar |
| 6 artículos del blog (con fuentes OMS/MedlinePlus) | En revisión médica | Requieren un profesional con perfil publicado como revisor |
| Privacidad, cookies, términos, política de citas, libro de reclamaciones | Borrador legal | Completar datos, validar con asesoría, borrar el aviso y publicar |

Mientras la **política de privacidad** no esté publicada, los formularios (solicitar cita, contacto) se
muestran como «no disponibles todavía»: es el bloqueo legal previsto.

## 6. Configuración (sólo Administración)

* **Datos públicos (NAP)**: deben coincidir exactamente con Google Business Profile.
* **Horario** en formato `1-5 09:00-19:00` (1 = lunes … 7 = domingo), una línea por bloque.
* **Integraciones**: ID de GA4 y token opcional de Search Console. **Nunca** pegar aquí claves secretas.
* **Libro de reclamaciones**: activarlo sólo con validación legal, razón social/RUC y responsable.

## 7. Privacidad, reclamaciones y auditoría

* **Reclamaciones y derechos**: registros del libro de reclamaciones y solicitudes de acceso,
  rectificación, cancelación, oposición o revocación. Acceso sólo Administración.
* **Auditoría**: registro inalterable de accesos sensibles (ver un contacto, exportar) y cambios.
* **Reportes**: totales por estado, origen y mes. La exportación CSV no incluye datos de contacto y queda
  auditada.
* No exportar ni copiar datos de pacientes fuera del panel salvo procedimiento aprobado.
