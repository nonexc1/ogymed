# Mapa SEO de OGYMED

Hipótesis de palabras clave **sin volúmenes medidos** (no se han consultado herramientas de
búsqueda). Validar con Search Console tras 2–3 meses de datos reales. Google no garantiza posiciones.

## Asignación keyword → URL (evitar canibalización)

| URL | Intención principal | Hipótesis de consulta | Notas |
|---|---|---|---|
| `/` | Marca + ubicación | «OGYMED», «clínica ginecológica en Surco» | H1 actual: «Clínica ginecológica en Santiago de Surco». Única página que trabaja la consulta genérica. |
| `/servicios` | Catálogo | «servicios ginecológicos Surco» | Sólo servicios publicados. |
| `/servicios/[slug]` | Servicio concreto + Surco | «[servicio] en Surco» (p. ej. «consulta ginecológica Surco») | Cada servicio trabaja **su** intención. Sin páginas por distrito. |
| `/equipo` | Equipo | «ginecólogos OGYMED» | |
| `/equipo/[slug]` | Nombre del profesional | «Dra./Dr. [nombre] ginecología» | «Ginecóloga en Surco» sólo si es veraz respecto del equipo. |
| `/contacto` | Ubicación/NAP | «OGYMED dirección», «OGYMED teléfono» | Centraliza ubicación; JSON-LD MedicalClinic. |
| `/primera-visita` | Información práctica | «primera consulta ginecológica qué llevar» | Sólo contenido confirmado por el equipo médico. |
| `/preguntas-frecuentes` | Operativa | «OGYMED reservas», «cancelar cita OGYMED» | Preguntas reales. |
| `/blog/[slug]` | Educativa | Preguntas de pacientes por tema | Autor + revisor + referencias. |

**No** crear páginas para Miraflores, San Borja u otros distritos sin sede ni contenido local útil.
**No** afirmar «la mejor clínica», rankings ni popularidad. **No** meta keywords ni texto oculto.

## Enlazado interno implementado

* Servicio → profesionales que lo realizan → perfil.
* Perfil → servicios del profesional.
* Artículo → servicios relacionados (`related_service_ids`) y perfil del autor.
* Portada → servicios, equipo, preguntas, contacto.
* Breadcrumbs (con `BreadcrumbList`) en todas las páginas internas.

## Datos estructurados implementados

| Página | Tipo | Propiedades (sólo si existen en Configuración/CMS) |
|---|---|---|
| Portada, contacto | `MedicalClinic` | name, url, address (calle sólo si está cargada), telephone, email, geo, hasMap, openingHoursSpecification, sameAs, legalName |
| Fichas internas | `BreadcrumbList` | — |
| Perfil | `Person` | name, honorificPrefix, jobTitle, worksFor, image, identifier CMP/RNE (sólo verificados) |
| Artículo | `Article` + `MedicalWebPage` | headline, fechas reales, author, publisher, lastReviewed, reviewedBy |
| Preguntas frecuentes | `FAQPage` | Sin prometer resultados enriquecidos (Google los limita) |

Nunca `AggregateRating` ni reseñas propias. Validar en https://validator.schema.org y en la
prueba de resultados enriquecidos de Google (un tipo válido no garantiza resultado enriquecido).

## Calendario editorial propuesto (8–12 temas, pendientes de revisor)

Temas orientados a preguntas frecuentes de pacientes. Cada uno requiere: autor, **revisor médico de
OGYMED**, fuentes clínicas verificables (guías de sociedades médicas, OMS/MINSA) y aprobación antes
de publicar. Sólo se vinculan a servicios que OGYMED confirme ofrecer.

| # | Tema propuesto | Servicio relacionado (si se confirma) | Preguntas de pacientes | Revisor |
|---|---|---|---|---|
| 1 | Qué esperar en tu primera consulta ginecológica | Consulta ginecológica | ¿Qué llevar? ¿Cuánto dura? | Pendiente |
| 2 | ¿Cada cuánto hacerse un control ginecológico? | Prevención y controles | ¿Es necesario si no tengo síntomas? | Pendiente |
| 3 | Papanicolaou y prueba de VPH: diferencias | Prevención y controles | ¿Cuál necesito? | Pendiente |
| 4 | Cómo prepararse para una ecografía ginecológica | Ecografía ginecológica | ¿Transvaginal o abdominal? | Pendiente |
| 5 | Qué es una colposcopia y cuándo se indica | Colposcopia | ¿Duele? ¿Cuánto tarda? | Pendiente |
| 6 | Métodos anticonceptivos: cómo elegir con tu ginecóloga | Planificación familiar | ¿Cuál es para mí? | Pendiente |
| 7 | Perimenopausia y menopausia: cambios frecuentes | Menopausia | ¿Cuándo consultar? | Pendiente |
| 8 | Ciclo menstrual: qué es habitual y cuándo consultar | Consulta ginecológica | ¿Es normal…? | Pendiente |
| 9 | Vacuna contra el VPH: preguntas frecuentes | Prevención y controles | ¿Hasta qué edad? | Pendiente |
| 10 | Cómo reservar, cambiar o cancelar tu cita en OGYMED | — (operativo) | ¿Necesito cuenta? | Recepción |

Reglas: sin promesas de eficacia, sin testimonios inventados, sin recomendaciones personalizadas;
borradores asistidos por IA siempre pasan por revisión médica; no automatizar volumen.

## Rendimiento (objetivos, no garantías)

* Campo (p75, móvil): LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 — medir en Search Console cuando haya datos.
* Laboratorio: Lighthouse 90+ como meta. Resultados medidos: ver `ACEPTACION.md`.
* Implementado: páginas estáticas/ISR, fuentes autoalojadas (2 familias), imágenes con dimensiones y
  AVIF/WebP vía `next/image`, carga diferida salvo imagen principal, mapa bajo demanda, sin vídeos de
  fondo ni carruseles, JS cliente sólo en componentes interactivos.

## Indexación y entornos

* `SITE_INDEXING=on` **sólo** en producción con dominio final. En previews/staging: `X-Robots-Tag:
  noindex` y `robots.txt` con `Disallow: /`.
* Excluidos siempre de sitemap y con `noindex`: `/admin`, `/reservar`, `/cita/*`, `/api/*`,
  `/libro-de-reclamaciones`, previsualizaciones y borradores (que además requieren sesión).
* Tras el lanzamiento, comprobar que producción **no** conserva el `noindex` de staging.
