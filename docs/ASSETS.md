# Assets necesarios para completar el diseño

El rediseño de la web pública (2026-10-28) deja cada fotografía como un espacio **administrable desde el
panel**: se sube en **Medios** (derechos confirmados y texto alternativo obligatorios) y se elige en el
campo **«Imagen principal»** de cada página. Mientras falte, la sección usa su variante sin fotografía: la
web pública nunca muestra marcadores. La **vista de demostración privada** (`/admin/demo`, enlace en
Contenido) muestra dónde va cada foto con huecos rotulados «Fotografía pendiente».

## 1. Fotografías por espacio

| Espacio | Dónde se carga | Formato recomendado | Contenido | Estado |
|---|---|---|---|---|
| Hero de la portada | Contenido → Portada → Imagen principal | Horizontal 4:3, ≥ 2000×1500 px (en móvil se recorta casi cuadrada: sujeto centrado) | Retrato editorial con luz natural. Si aparece personal, debe ser real de OGYMED con autorización; si es una modelo, sin bata ni consultorio | 🟡 Foto IA generada (ver §2) |
| Sección «Servicios» de la portada | Contenido → Servicios (índice) → Imagen principal | Vertical 4:5, ≥ 1600×2000 px | Detalle cálido o bodegón; no equipamiento que la sede no tenga | 🟡 Foto IA generada |
| «La clínica» (cabecera 4:5 y banda de portada 21:9) | Contenido → La clínica → Imagen principal | Horizontal amplia ≥ 2400×1350 px con el motivo centrado (se recorta en ambos formatos) | **Instalaciones reales**: sala de espera, recepción o consultorio | ⛔ Falta foto real (hay textura IA provisional) |
| «Tu cita, paso a paso» | Contenido → Primera visita → Imagen principal | Vertical 4:5 (en móvil 4:3) | Preparación de la visita (libreta, manos, luz natural) | 🟡 Foto IA generada; sólo se ve cuando «Primera visita» esté publicada |
| Ubicación (si no hay mapa) | Contenido → Contacto → Imagen principal | 4:3 | Fachada o acceso real de la sede | ⛔ Falta |
| Retrato de cada profesional | Profesionales → ficha → Foto | Vertical 4:5, ≥ 1200×1500 px, fondo neutro | Foto real, autorizada por escrito | ⛔ Faltan |
| Foto de cada servicio (opcional) | Servicios → ficha → Imagen principal | 16:9 | Real o con licencia; nunca equipamiento que no exista | ℹ️ Opcional |

## 2. Fotografías generadas con IA (cuenta Fish Audio de OGYMED, 2026-10-27/28)

Imágenes **conceptuales** (no muestran personal, instalaciones ni pacientes de OGYMED), generadas con
`seedream-5-0` a 2K. **No se pudieron descargar en la sesión de desarrollo** (la red bloquea
`platform.r2.fish.audio`) y **nadie del equipo técnico las ha revisado visualmente**: antes de subirlas,
revisar manos, rostros y detalles (artefactos típicos de IA) y descartar las que no sirvan.

| Archivo | Abrir en Fish Audio | Espacio sugerido | Texto alternativo sugerido (ajustar a lo que se vea) |
|---|---|---|---|
| Hero (4:3) | [historial](https://fish.audio/app/image-video/history/?g=c51fbc586366109253f26fab1db5b12f&workspace_id=5857a845579a428e8dbb10b4a3820043) | Portada | Mujer sonriendo con una taza junto a una ventana con luz natural |
| Bodegón (3:4) | [historial](https://fish.audio/app/image-video/history/?g=5deeae746cc7b434f4fc4c40ef55f818&workspace_id=5857a845579a428e8dbb10b4a3820043) | Servicios (índice) | Jarrón con ramas de eucalipto y flores secas sobre una mesa con luz de la mañana |
| Libreta (16:9) | [historial](https://fish.audio/app/image-video/history/?g=49f156e3e506316085d1d13e9e364695&workspace_id=5857a845579a428e8dbb10b4a3820043) | Primera visita | Manos escribiendo preguntas en una libreta junto a un vaso de agua |
| Textura (16:9) | [historial](https://fish.audio/app/image-video/history/?g=1f4fe679a4480444e2a601da741ef7a1&workspace_id=5857a845579a428e8dbb10b4a3820043) | La clínica (provisional hasta tener fotos reales) | Luz y sombras de hojas sobre una pared clara |

Pasos: descargar desde Fish Audio → panel → **Medios** → subir (se convierte a WebP y se eliminan
metadatos) → escribir el texto alternativo → marcar «derechos confirmados» → en la página indicada,
**Imagen principal** → Guardar borrador → Publicar → Contenido → «Actualizar la web ahora».

## 3. Identidad

| Asset | Para qué | Estado |
|---|---|---|
| Logo en vector (SVG o PDF) y PNG transparente ≥ 1024 px | Cabecera, pie, favicon, imagen al compartir | ⛔ Se recibió un JPG circular en coral (texto «Obstetricia Ginecología y Medicina»). La web mantiene la palabra «OGYMED» en la serif de títulos y la paleta marfil/ciruela por indicación de OGYMED. Decidir: ¿se usa el logo circular? ¿en coral o adaptado a ciruela? |
| Versión horizontal y monocromática del logo | Cabecera estrecha y fondos ciruela | ⛔ |
| Favicon / icono de app (512×512) | Pestaña del navegador, accesos directos | ℹ️ Hoy se usa un icono provisional |

El texto del logo menciona **obstetricia**: no se publica como servicio mientras OGYMED no lo confirme.

## 4. Datos que desbloquean secciones

| Dato | Desbloquea | Dónde |
|---|---|---|
| Política de privacidad publicada (completar `[COMPLETAR]` y validar) | Formulario «Solicitar cita» y contacto; dato «Solicitud de cita en línea» de la banda | Contenido → Política de privacidad |
| WhatsApp, teléfono y/o correo | Botón WhatsApp del hero, canales en /reservar y /contacto, banda de datos | Configuración → Datos públicos |
| Dirección, referencia, coordenadas, enlace de Google Maps | Dirección exacta, «Cómo llegar», mapa voluntario | Configuración → Datos públicos |
| Horario de atención | Banda de datos, ubicación, pie | Configuración → Datos públicos |
| Servicios aprobados por revisión médica | Sección «Servicios» de la portada y menú | Servicios (revisor médico) |
| Profesionales con CMP/RNE verificados | Sección «Equipo médico» y menú | Profesionales |
| «Primera visita» completa y aprobada | Sección «Tu cita, paso a paso» con foto y enlace | Contenido → Primera visita |

Con menos de dos datos reales, la banda bajo el hero no se muestra; sin ninguna vía para pedir cita
(privacidad sin publicar y sin canales), la sección de pasos tampoco, y el Inicio del panel lo avisa.
