# Revisión de privacidad (Perú) — lista para la asesoría y la clínica

**Esto no es asesoría legal ni declara cumplimiento.** Tener un checkbox, cifrado o usar Supabase no
implica cumplir la Ley N.° 29733 (Protección de Datos Personales) ni su Reglamento aprobado por
D.S. N.° 016-2024-JUS. Verificar las disposiciones vigentes al desplegar con asesoría local.

## 1. Qué datos trata el sistema (inventario técnico real)

| Flujo | Datos | Dónde | Finalidad propuesta |
|---|---|---|---|
| Reserva web | Nombre, correo (verificado), teléfono opcional; fecha/hora, profesional y servicio de la cita | `contacts`, `appointments`, `consent_records` | Gestionar la cita, recordatorios, cambios |
| Reserva por recepción | Nombre, teléfono y/o correo; nota administrativa (no clínica) | Ídem | Ídem |
| Sesión de reserva | Hash del token de sesión; nombre/correo/teléfono pendientes de verificar; hash HMAC del código | `private.booking_sessions` (se purga a las 24 h de vencida) | Verificar el correo |
| Autogestión | Hash de tokens de acceso y de sesión | `private.access_tokens`, `private.manage_sessions` | Cambiar/cancelar sin cuenta |
| Formulario de contacto | Nombre, correo/teléfono, motivo, mensaje (se advierte no incluir datos médicos) | `contact_requests` | Responder la consulta |
| Libro de reclamaciones | Identificación (nombre, documento, domicilio, contacto, menor/apoderado), detalle, pedido | `complaints` | Atender el reclamo (obligación legal a validar) |
| Derechos ARCO | Nombre, correo, tipo y detalle | `privacy_requests` | Atender la solicitud |
| Personal | Correo, nombre, roles, factores MFA | Supabase Auth + `staff_*` | Acceso al panel |
| Auditoría | IDs técnicos y acciones (sin datos sensibles completos) | `audit_log` | Seguridad y trazabilidad |
| Límites de frecuencia | HMAC de la IP (no la IP) | `private.rate_limits` (se purga a 2 días) | Antiabuso |
| Analítica (opcional) | Datos de navegación de GA4 **sólo con consentimiento** y sólo en páginas generales | Google | Medir uso del sitio |

**No se recogen**: DNI (salvo libro de reclamaciones), fecha de nacimiento, síntomas, diagnósticos,
historia clínica, resultados ni pagos. Una agenda de citas ginecológicas igualmente revela información
sensible (relación con un servicio de salud): tratarla como tal.

## 2. Decisiones que debe tomar la clínica / asesoría

- [ ] **Responsable del tratamiento**: razón social, RUC, domicilio, canal de contacto para privacidad.
- [ ] **Finalidades y bases** de cada flujo (tabla anterior); separar atención/recordatorios del
      marketing (el sistema ya separa el consentimiento comercial: opcional y desmarcado).
- [ ] **Datos sensibles**: tratamiento de datos relacionados con salud y consentimiento aplicable.
- [ ] **Encargados/proveedores** y contratos de tratamiento: Supabase (base, auth, almacenamiento),
      Vercel (hosting), Resend (correo), Google (Analytics opcional, mapa bajo demanda), proveedor de DNS.
- [ ] **Transferencias internacionales**: la infraestructura estará fuera de Perú (región por definir).
      Evaluar requisitos y comunicarlo en la política. Elegir región por latencia no resuelve esto.
- [ ] **Registro del banco de datos** ante la Autoridad Nacional de Protección de Datos Personales, si
      corresponde, y su actualización.
- [ ] **Plazos de conservación** por tipo de dato (citas, contactos, sesiones, reclamaciones, auditoría,
      backups) y procedimiento de **anonimización/borrado** verificable (incluido el efecto en backups).
      El sistema ya tiene `admin_anonymize_contact`; falta el job automático con los plazos aprobados.
- [ ] **Derechos ARCO**: plazos de respuesta, verificación de identidad, responsable interno. El formulario
      público y el registro restringido existen; los plazos no se calculan hasta su validación.
- [ ] **Menores de edad**: política de atención y consentimiento antes de habilitar flujos específicos.
- [ ] **Gestión de incidentes** de seguridad: procedimiento, responsables y comunicaciones.
- [ ] **Libro de reclamaciones**: campos, textos, plazos y responsable operativo (desactivado por defecto).
- [ ] **Textos**: política de privacidad, cookies, términos y política de citas (el seed sólo trae
      plantillas «[DEMO]»). Cada versión publicada queda registrada en los consentimientos.
- [ ] **Cookies**: categorías (necesarias: `ogymed_consent`, `ogymed_booking`, `ogymed_manage`;
      analítica opcional: `_ga`, `_ga_*`), versión del consentimiento (`2026-10-v1`), duración (180 días),
      retención de datos en GA4.
- [ ] Confirmar que los formularios de agenda **no sustituyen** consentimientos clínicos.

## 3. Medidas técnicas implementadas (para la descripción de seguridad)

* RLS «denegar por defecto» en todas las tablas; el rol anónimo sólo lee contenido publicado.
* MFA obligatorio para el personal; acceso a citas sólo con MFA y rol; profesional limitado a su agenda.
* Tokens aleatorios de 256 bits guardados como hash; enlaces de un solo uso, de corta vigencia, con el
  token en el fragmento de la URL (no llega a servidores, logs ni Referer) y canje sólo por POST.
* Códigos de verificación con HMAC y pimienta del servidor, vencimiento e intentos limitados.
* Límite de frecuencia persistente, honeypot, protección CSRF por origen, cookies `HttpOnly`/`Secure`.
* Cabeceras de seguridad (CSP, HSTS, X-Frame-Options), `no-store` en rutas privadas.
* Logs sin cuerpos de formularios, tokens ni contactos; auditoría de sólo inserción.
* Correos sin diagnóstico ni nombre de procedimiento en el asunto; calendario con título genérico.
* GA4 sólo con consentimiento, sólo en páginas generales, con URL saneada y sin señales publicitarias.
* Imágenes subidas sin metadatos (EXIF/GPS).

## 4. Pendiente técnico ligado a decisiones legales

* Job de retención/anonimización con plazos aprobados.
* Texto final del consentimiento y su versión.
* Procedimiento de respuesta a incidentes y su registro.
* Revisión de la región de alojamiento y contratos con proveedores.
