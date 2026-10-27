# Configuración de Google (Search Console, Analytics 4, Business Profile)

Todo lo de esta guía requiere cuentas **propiedad de la clínica** y acceso al DNS del dominio final.
Nada de esto está configurado todavía (ver `DATOS_PENDIENTES.md`). Instalar Analytics o Search Console
**no** mejora posiciones por sí mismo: sirve para medir y diagnosticar.

## 1. Google Search Console

### Propiedad de dominio (recomendada)

1. Entrar a https://search.google.com/search-console con la cuenta de Google de la clínica.
2. «Agregar propiedad» → tipo **Dominio** → escribir el dominio sin protocolo (p. ej. `dominio-de-ogymed.pe`).
3. Google muestra un registro **TXT** (`google-site-verification=…`). Crearlo en el DNS del dominio (en el
   proveedor donde esté el dominio; no en Vercel salvo que Vercel gestione el DNS).
4. Esperar la propagación y pulsar «Verificar».
5. **Conservar el TXT para siempre**: si se elimina, se pierde la verificación.
6. Agregar como usuarios a las personas responsables (permiso «Completo» sólo a quien lo necesite).

> La etiqueta HTML `google-site-verification` **no** sirve para una propiedad de dominio.

### Propiedad de prefijo de URL (opcional, alternativa)

Si no hay acceso al DNS: tipo «Prefijo de URL» (`https://www.dominio/`) → método «Etiqueta HTML» →
copiar sólo el valor de `content` → Panel → Configuración → «Search Console · token de etiqueta HTML».
El sitio la publica en `<meta name="google-site-verification">` de las páginas públicas.

### Después de verificar

1. Comprobar que producción tiene `SITE_INDEXING=on` (si no, el sitio responde `noindex` y robots bloquea todo).
2. «Sitemaps» → enviar `https://<dominio>/sitemap.xml`.
3. «Inspección de URLs» → probar la portada, `/servicios`, una ficha de servicio y `/contacto`:
   indexable, canonical igual al dominio final, sin `noindex`.
4. Revisar semanalmente: «Páginas» (indexación y errores), «Experiencia → Métricas web principales»
   (LCP/INP/CLS de campo, aparecen cuando hay tráfico suficiente), «Mejoras» (datos estructurados).
5. Confirmar que `/admin`, `/reservar`, `/cita/*` y `/libro-de-reclamaciones` **no** aparecen indexados.

## 2. Google Analytics 4

### Crear la propiedad

1. https://analytics.google.com con la cuenta de la clínica → Administrar → Crear propiedad.
2. Zona horaria **(GMT-05:00) Lima**, moneda **PEN**, país **Perú**.
3. Crear un **flujo de datos web** para el dominio final.
4. Copiar el **ID de medición** (`G-XXXXXXXXXX`) → Panel → Configuración → «GA4 · ID de medición».
   Es un identificador público, no un secreto.

### Ajustes obligatorios de privacidad (en la propiedad)

| Ajuste | Dónde | Valor |
|---|---|---|
| Medición mejorada | Flujo de datos → Medición mejorada | **Desactivada por completo** (incluye «cambios de página según el historial», clics salientes, búsquedas, formularios, vídeos, descargas) |
| Google Signals | Configuración de datos → Recopilación de datos | **Desactivado** |
| Personalización de anuncios | Configuración de datos → Recopilación | **Desactivada** para todas las regiones |
| Vinculación con Google Ads / remarketing | Vinculación de productos | **No vincular** |
| User-ID | — | **No usar** |
| Retención de datos | Configuración de datos → Retención | El mínimo que se acuerde con la asesoría (p. ej. 2 meses) |
| Datos granulares de ubicación y dispositivo | Configuración de datos → Recopilación | **Desactivados** |

El código ya fuerza `send_page_view: false`, `allow_google_signals: false`,
`allow_ad_personalization_signals: false`, consentimiento publicitario `denied`, `page_title`
genérico, `page_referrer` vacío y `page_location` = dominio + ruta permitida sin parámetros.

### Qué se mide (y qué no)

* Sólo en: `/`, `/la-clinica`, `/servicios`, `/equipo`, `/primera-visita`, `/preguntas-frecuentes`,
  `/contacto`, `/blog`. Nunca en fichas de servicio, artículos, perfiles, reservas, autogestión,
  reclamaciones, privacidad ni admin.
* Eventos: `page_view` (saneado), `click_book`, `click_whatsapp`, `click_call`, `click_directions`,
  con un único parámetro `position` (`header`, `hero`, `mobile_bar`, `footer`, `section`, `contact`).
* Registrar `position` como **dimensión personalizada de evento** (Administrar → Definiciones
  personalizadas) para verla en informes.
* Un clic no demuestra una cita. Reservas, cancelaciones, asistencia y origen se ven en el
  **Panel → Reportes** (datos propios), nunca en GA4.
* No se usan UTMs en fichas de pacientes. Si se adopta una taxonomía de UTMs, sólo con lista cerrada y
  aprobada (pendiente).

### Verificación con datos sintéticos (DebugView)

1. En un navegador limpio, abrir la web de **staging** con una propiedad GA4 de pruebas (no la de
   producción) y la extensión «Google Analytics Debugger».
2. Aceptar cookies, recorrer páginas permitidas y pulsar botones de reserva/WhatsApp.
3. En GA4 → Administrar → DebugView: verificar que cada `page_view` tiene `page_location` sin
   parámetros, `page_title` = «OGYMED» y que no hay eventos en rutas sensibles.
4. Entrar a `/servicios/<algo>`, `/reservar` y `/admin`: no debe aparecer ningún evento.
5. No usar datos reales de pacientes en estas pruebas.

La prueba automática equivalente (con interceptación de red, sin salir a internet) es
`tests/e2e/analytics.spec.ts`.

## 3. Google Business Profile (SEO local)

1. Reclamar o crear **un único perfil** para la sede (https://business.google.com) con la cuenta de la clínica.
2. Nombre **exactamente** igual al nombre comercial (sin palabras clave añadidas).
3. Categoría principal acorde a la actividad real (p. ej. la categoría de ginecología/clínica que
   corresponda); categorías secundarias sólo si son ciertas.
4. Dirección, teléfono y horario **idénticos** a Panel → Configuración (NAP consistente). Cargar
   horarios especiales (feriados).
5. Verificar la ubicación por el método que Google ofrezca.
6. Enlace del sitio: `https://<dominio>/`. Enlace de citas: `https://<dominio>/reservar`.
7. Fotos reales de fachada, recepción e instalaciones (con autorización de las personas que aparezcan).
8. Servicios: sólo los ofrecidos realmente.
9. **Reseñas**: pedir opinión a todas las pacientes por igual, sin premios ni descuentos y sin filtrar
   por satisfacción. Responder sin revelar que alguien es paciente ni datos de su atención.
10. No crear perfiles para distritos donde no hay sede.

## 4. Dashboard de SEO

Search Console y GA4 se consultan en sus propias herramientas (o en Looker Studio conectado por la
clínica). La primera versión no integra APIs de Google en el panel.
