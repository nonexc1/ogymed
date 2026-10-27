-- =====================================================================================================
-- OGYMED · CONTENIDO INICIAL (real, no demo) para producción
-- =====================================================================================================
--
-- CÓMO USARLO
--   Supabase → SQL Editor → pegar TODO este archivo → Run. Se puede ejecutar más de una vez: no duplica
--   nada y no pisa lo que el equipo ya haya escrito en el panel (sólo reemplaza borradores de página que
--   sigan vacíos). Después, en el panel: Contenido → «Actualizar la web ahora».
--
-- QUÉ CARGA Y EN QUÉ ESTADO (respeta el flujo editorial del encargo)
--   * PUBLICADO: portada, la clínica, servicios (índice), equipo (índice), blog (índice), preguntas
--     frecuentes, contacto y 9 preguntas frecuentes operativas. No contienen datos clínicos ni datos de
--     OGYMED que no estén confirmados.
--   * EN REVISIÓN MÉDICA (no visibles hasta que un revisor médico habilitado los apruebe en el panel):
--     6 servicios, «Tu primera visita» y 6 artículos del blog. Son borradores asistidos por IA: el
--     encargo exige que permanezcan en revisión médica. Los servicios son los CANDIDATOS del encargo:
--     aprobar sólo los que OGYMED realmente ofrece (los demás → Archivar). Los artículos necesitan además
--     un profesional con perfil publicado como revisor.
--   * BORRADOR LEGAL (no visibles): privacidad, cookies, términos, política de citas y libro de
--     reclamaciones. Requieren los datos marcados «[COMPLETAR: …]» y validación de asesoría legal. La
--     migración 20261028000100 impide publicar cualquier texto que conserve «[COMPLETAR».
--
-- QUÉ NO CARGA (no se inventa): profesionales, CMP/RNE, dirección, teléfono, WhatsApp, horarios,
-- precios, duraciones, seguros ni fotografías. Se cargan en el panel (Configuración, Profesionales).
-- =====================================================================================================

begin;

-- -----------------------------------------------------------------------------------------------------
-- 1. Páginas
-- -----------------------------------------------------------------------------------------------------
insert into public.pages as p
  (kind, title, intro, body_md, sections, seo_title, seo_description, requires_medical_review, document_version, status, submitted_at)
values
-- Portada ---------------------------------------------------------------------------------------------
('home',
 'Clínica ginecológica en Santiago de Surco',
 'Un espacio dedicado a tu salud ginecológica en Surco, Lima. Pide tu cita en línea en pocos pasos, sin crear una cuenta.',
 '',
 jsonb_build_object(
   'hero_kicker', 'Clínica ginecológica · Santiago de Surco',
   'hero_title', 'Atención ginecológica en Santiago de Surco',
   'hero_text', 'Un espacio dedicado a tu salud ginecológica en Surco, Lima. Pide tu cita en línea en pocos pasos, sin crear una cuenta.',
   'highlights', jsonb_build_array(
     jsonb_build_object('title', 'Sin crear una cuenta',
       'text', 'Para pedir tu cita solo necesitas tu nombre y un medio de contacto. No tienes que registrarte ni recordar contraseñas.'),
     jsonb_build_object('title', 'Solo lo necesario',
       'text', 'Por la web no te pedimos síntomas, diagnósticos ni documentos. Esa información se conversa en la consulta.'),
     jsonb_build_object('title', 'Información revisada',
       'text', 'Los contenidos de salud de esta web se publican solo después de la revisión de un profesional de nuestro equipo.')
   )),
 'OGYMED · Clínica ginecológica en Santiago de Surco, Lima',
 'Clínica ginecológica en Santiago de Surco, Lima. Conoce nuestros servicios y pide tu cita en línea, sin crear una cuenta.',
 false, null, 'published', null),

-- La clínica ------------------------------------------------------------------------------------------
('clinic',
 'La clínica',
 'OGYMED es una clínica dedicada a la salud ginecológica, ubicada en Santiago de Surco, Lima.',
 $md$## Nuestro enfoque

En OGYMED nos dedicamos a la ginecología. Queremos que cada visita sea clara desde el primer contacto: que sepas qué esperar, cómo pedir tu cita y cómo cambiarla si lo necesitas.

## Cómo trabajamos

- **Citas sencillas.** Puedes pedir tu cita en línea en pocos pasos. Todos los horarios se muestran en hora de Lima.
- **Privacidad desde el inicio.** Para agendar solo pedimos tus datos de contacto. No solicitamos síntomas, diagnósticos ni historia clínica por la web.
- **Información revisada.** Los contenidos de salud que publicamos —servicios, artículos y la guía de primera visita— pasan antes por la revisión de un profesional de nuestro equipo.

## Dónde estamos

Atendemos en Santiago de Surco, Lima. Encontrarás la dirección y los datos de contacto en esta página y en [Contacto](/contacto).$md$,
 '{}'::jsonb,
 'La clínica · OGYMED, ginecología en Santiago de Surco',
 'Conoce OGYMED, clínica dedicada a la salud ginecológica en Santiago de Surco, Lima: cómo trabajamos y dónde encontrarnos.',
 false, null, 'published', null),

-- Primera visita (requiere revisión médica) -----------------------------------------------------------
('first_visit',
 'Tu primera visita',
 'Qué esperar en tu primera consulta en OGYMED y cómo prepararte.',
 $md$## Antes de tu cita

- **Revisa tu confirmación.** Comprueba la fecha y la hora (hora de Lima). Si necesitas cambiarla, hazlo con anticipación según nuestra política de citas.
- **Ten a mano tu información de salud.** Te será útil saber la fecha de tu última menstruación y llevar una lista de los medicamentos, vitaminas o suplementos que tomas, y de tus alergias.
- **Lleva tus resultados anteriores.** Si tienes resultados de controles previos (por ejemplo, Papanicolaou, prueba de VPH o ecografías), tráelos o tenlos disponibles.
- **Anota tus preguntas.** Escribir con calma lo que quieres consultar ayuda a que no quede nada pendiente.
- **Documentos:** [COMPLETAR: documentos que pide la clínica para el registro, p. ej. DNI o carné de extranjería, y si se atiende con seguros].

## Durante la consulta

La consulta empieza con una conversación sobre el motivo de tu visita, tus antecedentes y tus dudas. Según el caso, tu médico puede proponerte un examen físico, que puede incluir un examen ginecológico. Antes de cualquier examen te explicarán en qué consiste y podrás preguntar todo lo que necesites. Puedes pedir que se detenga en cualquier momento.

Si hacen falta pruebas complementarias, te indicarán cuáles y cómo prepararte.

## Si estás menstruando

En general puedes asistir a la consulta durante tu menstruación. Algunas pruebas, como el Papanicolaou, suelen programarse fuera de esos días: si tu cita incluye una de ellas, avísanos para reprogramarla si hace falta.

## Llegada

[COMPLETAR: con cuánta anticipación conviene llegar, referencias para llegar, estacionamiento y accesibilidad de la sede].$md$,
 '{}'::jsonb,
 'Primera consulta ginecológica: qué llevar | OGYMED',
 'Cómo prepararte para tu primera consulta ginecológica en OGYMED, Santiago de Surco: qué llevar, qué esperar y cómo gestionar tu cita.',
 true, null, 'medical_review', now()),

-- Preguntas frecuentes (introducción) -----------------------------------------------------------------
('faq',
 'Preguntas frecuentes',
 'Respuestas sobre cómo pedir, cambiar o cancelar tu cita y qué esperar de tu visita.',
 '', '{}'::jsonb,
 'Preguntas frecuentes sobre citas | OGYMED',
 'Cómo pedir, cambiar o cancelar tu cita en OGYMED, clínica ginecológica en Santiago de Surco, y qué datos te pedimos.',
 false, null, 'published', null),

-- Contacto --------------------------------------------------------------------------------------------
('contact',
 'Contacto',
 'Encuentra cómo comunicarte con OGYMED y cómo llegar a nuestra sede en Santiago de Surco, Lima.',
 '', '{}'::jsonb,
 'Contacto y ubicación · OGYMED, Santiago de Surco',
 'Cómo contactar a OGYMED, clínica ginecológica en Santiago de Surco, Lima, y cómo llegar a nuestra sede.',
 false, null, 'published', null),

-- Índices ---------------------------------------------------------------------------------------------
('services_index',
 'Servicios',
 'Atención ginecológica en Santiago de Surco. Elige un servicio para saber en qué consiste, qué esperar y cómo pedir tu cita.',
 '', '{}'::jsonb,
 'Servicios ginecológicos en Santiago de Surco | OGYMED',
 'Servicios de ginecología de OGYMED en Santiago de Surco, Lima: en qué consiste cada uno, qué esperar y cómo pedir tu cita.',
 false, null, 'published', null),

('team_index',
 'Equipo',
 'Conoce a los profesionales que te atienden en OGYMED: su especialidad, sus credenciales verificadas y los servicios que realizan.',
 '', '{}'::jsonb,
 'Equipo médico de OGYMED en Santiago de Surco',
 'Profesionales de OGYMED, clínica ginecológica en Santiago de Surco, Lima: especialidad, credenciales verificadas y servicios.',
 false, null, 'published', null),

('blog_index',
 'Blog',
 'Información educativa sobre salud ginecológica, revisada por nuestro equipo médico. No sustituye una consulta.',
 '', '{}'::jsonb,
 'Blog de salud ginecológica | OGYMED',
 'Artículos sobre salud ginecológica revisados por el equipo médico de OGYMED, clínica en Santiago de Surco, Lima.',
 false, null, 'published', null),

-- Textos legales: BORRADORES (requieren datos de OGYMED y validación legal) --------------------------
('privacy',
 'Política de privacidad',
 'Cómo tratamos tus datos personales cuando usas esta web y cuando pides o gestionas una cita.',
 $md$> **[COMPLETAR: borra este aviso cuando la asesoría valide el texto]** Borrador pendiente de validación legal (Ley N.° 29733 y su Reglamento, D. S. N.° 016-2024-JUS). Completa los campos marcados y revisa el texto con asesoría antes de publicarlo.

## 1. Responsable del tratamiento

[COMPLETAR: razón social], con RUC [COMPLETAR: RUC] y domicilio en [COMPLETAR: dirección], Santiago de Surco, Lima, Perú (en adelante, «OGYMED»).

Para cualquier consulta sobre privacidad puedes escribir a [COMPLETAR: correo de privacidad] o usar el formulario de esta página.

## 2. Qué datos tratamos

| Cuándo | Datos | Para qué |
|---|---|---|
| Al pedir o reservar una cita | Nombre, correo electrónico, teléfono (opcional), servicio, profesional, fecha y hora de la cita | Gestionar tu cita, confirmarla, enviarte recordatorios y avisarte de cambios |
| Al verificar tu correo | Correo y un código temporal (se guarda cifrado) | Comprobar que el correo es tuyo |
| Al gestionar tu cita | Enlaces de acceso de un solo uso (se guardan cifrados) | Permitirte cambiar o cancelar sin crear una cuenta |
| Formulario de contacto | Nombre, correo o teléfono, motivo y mensaje | Responder tu consulta |
| Solicitudes de derechos | Nombre, correo y detalle de la solicitud | Atender tu solicitud |
| Libro de reclamaciones | Los datos que exige el formulario | Atender tu reclamo o queja |
| Navegación | Cookies necesarias y, solo si lo aceptas, cookies de analítica | Funcionamiento del sitio y medición agregada de visitas |

No te pedimos por la web síntomas, diagnósticos, historia clínica ni resultados. Ten en cuenta que el hecho de tener una cita en una clínica ginecológica puede revelar información relacionada con tu salud: por eso la tratamos como información sensible y con acceso restringido.

## 3. Base para el tratamiento

[COMPLETAR con asesoría: consentimiento y demás bases aplicables a cada finalidad]. Las comunicaciones comerciales solo se envían si lo autorizas expresamente; esa autorización es opcional, aparece desmarcada y no afecta tu cita.

## 4. Con quién compartimos tus datos

No vendemos tus datos. Para operar la web usamos proveedores que tratan datos por encargo de OGYMED:

- **Supabase** (base de datos y acceso del personal).
- **Vercel** (alojamiento de la web).
- **Resend** (envío de correos de la cita).
- **Google** (Google Analytics, solo si aceptas las cookies de analítica; mapa, solo si decides cargarlo).

Estos servicios pueden almacenar datos fuera del Perú: [COMPLETAR: región de alojamiento y tratamiento de la transferencia internacional, validado con asesoría].

## 5. Cuánto tiempo conservamos los datos

[COMPLETAR: plazos de conservación por tipo de dato, validados con asesoría]. Algunos datos técnicos se eliminan automáticamente: las sesiones de reserva no completadas, a las 24 horas de vencidas, y los registros antiabuso, a los 2 días.

## 6. Tus derechos

Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como los demás que reconozca la normativa vigente, mediante el formulario de esta página o escribiendo a [COMPLETAR: correo de privacidad]. Podemos pedirte información para verificar tu identidad. Responderemos en los plazos legales: [COMPLETAR: plazos validados].

Si consideras que no atendimos tu solicitud, puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.

## 7. Seguridad

Aplicamos medidas técnicas y organizativas para proteger tus datos: conexión cifrada, acceso del personal con verificación en dos pasos y según su función, enlaces de gestión de un solo uso, registro de accesos y datos mínimos.

## 8. Menores de edad

[COMPLETAR: política de atención y consentimiento para menores de edad].

## 9. Banco de datos

[COMPLETAR: denominación y código de inscripción del banco de datos ante la Autoridad, si corresponde].

## 10. Cambios en esta política

Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha. La versión vigente es la que aceptas al pedir una cita.$md$,
 '{}'::jsonb,
 'Política de privacidad | OGYMED',
 'Cómo trata OGYMED tus datos personales al usar la web y al pedir o gestionar una cita.',
 false, '1.0', 'draft', null),

('cookies',
 'Política de cookies',
 'Qué cookies usa esta web, para qué sirven y cómo cambiar tu elección.',
 $md$> **[COMPLETAR: borra este aviso cuando la asesoría valide el texto]** Borrador pendiente de validación legal. La tabla de esta página se genera a partir de las cookies que el sitio usa realmente.

## Qué son las cookies

Las cookies son pequeños archivos que el navegador guarda cuando visitas una web. Algunas son necesarias para que el sitio funcione; otras sirven para medir cómo se usa.

## Cookies necesarias

Permiten recordar tu elección sobre cookies, mantener tu reserva mientras la completas y la sesión para gestionar tu cita. No se pueden desactivar porque sin ellas esas funciones no operarían. No se usan para publicidad.

## Cookies de analítica (opcionales)

Solo si las aceptas, usamos Google Analytics para conocer de forma agregada cuántas personas visitan las páginas generales del sitio. Nunca se activan en las páginas de reserva, de gestión de citas ni en los formularios. Hemos desactivado las funciones publicitarias de Google.

## Cómo cambiar tu elección

Puedes aceptar, rechazar o cambiar tu elección en cualquier momento desde «Configurar cookies», al pie de cada página. Rechazar la analítica no te impide reservar ni usar la web. Tu elección se guarda durante 180 días.

## Más información

Para saber cómo tratamos tus datos personales, consulta nuestra política de privacidad.

[COMPLETAR: validación de asesoría y fecha de entrada en vigor].$md$,
 '{}'::jsonb,
 'Política de cookies | OGYMED',
 'Qué cookies usa la web de OGYMED, para qué sirven y cómo cambiar tu elección en cualquier momento.',
 false, '1.0', 'draft', null),

('terms',
 'Términos y condiciones',
 'Condiciones de uso de la web de OGYMED.',
 $md$> **[COMPLETAR: borra este aviso cuando la asesoría valide el texto]** Borrador pendiente de validación legal.

## 1. Quiénes somos

Esta web pertenece a [COMPLETAR: razón social], con RUC [COMPLETAR: RUC] y domicilio en [COMPLETAR: dirección], Santiago de Surco, Lima, Perú.

## 2. Información de salud

Los contenidos de esta web son informativos y generales. No sustituyen una consulta médica ni constituyen un diagnóstico o una indicación de tratamiento. Para una valoración de tu caso, pide una cita.

**Emergencias:** esta web no atiende urgencias. Si tienes una emergencia, acude al servicio de emergencias más cercano o llama al SAMU (106).

## 3. Citas

Las citas se rigen por nuestra política de citas. Seleccionar un horario no lo reserva: la cita queda confirmada solo cuando lo indicamos en pantalla y por correo, o cuando recepción la confirma.

## 4. Uso adecuado

Te comprometes a dar datos veraces y a no usar la web para fines ilícitos, para suplantar a otras personas ni para interferir con su funcionamiento.

## 5. Propiedad intelectual

Los textos, la marca y los diseños de esta web pertenecen a OGYMED o se usan con autorización. No pueden reproducirse sin permiso.

## 6. Enlaces externos

Los enlaces a sitios de terceros (por ejemplo, fuentes de información de salud) se incluyen como referencia. OGYMED no controla su contenido.

## 7. Responsabilidad

[COMPLETAR con asesoría: alcance y límites de responsabilidad].

## 8. Ley aplicable

Estos términos se rigen por las leyes de la República del Perú. [COMPLETAR con asesoría: jurisdicción y canal de atención].$md$,
 '{}'::jsonb,
 'Términos y condiciones | OGYMED',
 'Condiciones de uso de la web de OGYMED, clínica ginecológica en Santiago de Surco, Lima.',
 false, '1.0', 'draft', null),

('booking_policy',
 'Política de citas',
 'Cómo pedir, confirmar, cambiar o cancelar tu cita en OGYMED.',
 $md$> **[COMPLETAR: borra este aviso cuando la asesoría valide el texto]** Borrador pendiente de definición por OGYMED y validación legal.

## Cómo pedir una cita

Puedes pedir tu cita en esta web o comunicándote con recepción. Todos los horarios están en hora de Lima. Seleccionar un horario en la web lo aparta durante unos minutos mientras completas tus datos; no es una cita confirmada.

## Confirmación

Te enviamos la confirmación por correo, con la fecha, la hora y un enlace seguro para gestionar tu cita. Si tu pedido requiere la revisión de recepción, verás el aviso «Solicitud recibida» y te escribiremos cuando la confirmemos.

## Cambios y cancelaciones

Puedes cambiar o cancelar tu cita desde el enlace del correo hasta [COMPLETAR: número de horas; debe coincidir con Configuración → Parámetros de agenda] horas antes. Después de ese plazo, comunícate con recepción.

## Puntualidad

[COMPLETAR: tolerancia de llegada y qué ocurre si llegas tarde].

## Inasistencias

[COMPLETAR: qué ocurre si no asistes sin avisar].

## Pagos

La web no cobra ni pide datos de pago. [COMPLETAR: medios de pago en la clínica y si se cobra algún adelanto].

## Menores de edad

[COMPLETAR: si se atiende a menores y en qué condiciones].

## Tus datos

Tratamos tus datos según nuestra política de privacidad.$md$,
 '{}'::jsonb,
 'Política de citas | OGYMED',
 'Cómo pedir, confirmar, cambiar o cancelar tu cita en OGYMED, clínica ginecológica en Santiago de Surco.',
 false, '1.0', 'draft', null),

('complaints',
 'Libro de reclamaciones',
 'Registra un reclamo o una queja sobre nuestros servicios.',
 $md$> **[COMPLETAR: borra este aviso cuando la asesoría valide el texto]** Borrador pendiente de validación legal. El libro de reclamaciones virtual permanece desactivado hasta que exista un responsable operativo y se valide el formulario.

Conforme al Código de Protección y Defensa del Consumidor, OGYMED pone a tu disposición un Libro de Reclamaciones.

- **Reclamo:** disconformidad relacionada con los productos o servicios.
- **Queja:** disconformidad no relacionada con los productos o servicios, o malestar respecto de la atención.

Al enviar el formulario recibirás una constancia con el número de registro. Responderemos en el plazo legal: [COMPLETAR: plazo validado por asesoría] al correo que indiques.

[COMPLETAR: razón social, RUC y domicilio del establecimiento].$md$,
 '{}'::jsonb,
 'Libro de reclamaciones | OGYMED',
 'Libro de reclamaciones virtual de OGYMED.',
 false, '1.0', 'draft', null)

-- Sólo reemplaza páginas que aún sean borradores vacíos (p. ej. creadas con «Crear borrador» sin editar).
on conflict (kind) do update set
  title = excluded.title, intro = excluded.intro, body_md = excluded.body_md, sections = excluded.sections,
  seo_title = excluded.seo_title, seo_description = excluded.seo_description,
  requires_medical_review = excluded.requires_medical_review, document_version = excluded.document_version,
  status = excluded.status, submitted_at = excluded.submitted_at
where p.status = 'draft' and not p.is_demo and p.intro = '' and p.body_md = '' and p.sections = '{}'::jsonb;

-- -----------------------------------------------------------------------------------------------------
-- 2. Servicios (candidatos del encargo) → EN REVISIÓN MÉDICA
--    Aprobar sólo los que OGYMED ofrece. Sin precios ni duraciones (se configuran y aprueban aparte).
-- -----------------------------------------------------------------------------------------------------
insert into public.services
  (slug, name, category, summary, body_md, audience_md, what_to_expect_md, preparation_md, faqs,
   seo_title, seo_description, sort_order, status, submitted_at)
values
-- Consulta ginecológica -------------------------------------------------------------------------------
('consulta-ginecologica', 'Consulta ginecológica', 'Consultas',
 'Una consulta para hablar de tu salud ginecológica, resolver tus dudas y, si hace falta, realizar un examen o indicar pruebas.',
 $md$La consulta ginecológica es el espacio para revisar tu salud ginecológica con un profesional: hablar de lo que te preocupa, de tus antecedentes y de tus dudas, y decidir juntos los siguientes pasos.

Puedes pedirla por un motivo concreto o simplemente porque quieres revisar cómo estás. Algunos motivos frecuentes de consulta son:

- Cambios en tu ciclo menstrual: reglas irregulares, muy abundantes o dolorosas.
- Flujo vaginal distinto al habitual, picazón o molestias.
- Dolor pélvico o molestias durante las relaciones sexuales.
- Dudas sobre métodos anticonceptivos.
- Cambios relacionados con la perimenopausia o la menopausia.
- Controles y pruebas de prevención.$md$,
 $md$Para cualquier persona que quiera consultar sobre su salud ginecológica, tenga o no síntomas.

Si tienes un sangrado muy abundante, dolor intenso o sientes que tu vida corre peligro, no esperes a una cita: acude a emergencias o llama al SAMU (106).$md$,
 $md$1. **Conversación.** Te preguntarán por el motivo de tu visita, tus antecedentes de salud, tu ciclo menstrual y los medicamentos que tomas.
2. **Examen, si es necesario.** Según el caso, puede incluir un examen de mamas, abdominal o ginecológico. Antes te explicarán en qué consiste y podrás hacer preguntas o pedir que se detenga en cualquier momento.
3. **Plan.** Al final te explicarán lo encontrado y, si hace falta, qué pruebas o tratamientos se proponen y cuándo volver.$md$,
 $md$- Anota la fecha de tu última menstruación.
- Lleva la lista de medicamentos o suplementos que tomas y tus resultados anteriores, si los tienes.
- Escribe tus preguntas para no olvidarlas.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿Puedo ir a la consulta si estoy menstruando?',
     'a', 'En general, sí. Si en la consulta está previsto un Papanicolaou, suele ser mejor hacerlo fuera de la menstruación; avísanos y lo reprogramamos si hace falta.'),
   jsonb_build_object('q', '¿Tengo que hacerme un examen ginecológico en todas las consultas?',
     'a', 'No necesariamente. Depende del motivo de tu visita. Tu médico te explicará si es recomendable y podrás decidir con toda la información.')),
 'Consulta ginecológica en Santiago de Surco | OGYMED',
 'Consulta ginecológica en Santiago de Surco, Lima: qué esperar, cómo prepararte y cómo pedir tu cita en OGYMED.',
 10, 'medical_review', now()),

-- Prevención y controles ------------------------------------------------------------------------------
('prevencion-y-controles', 'Prevención y controles', 'Prevención',
 'Controles periódicos para cuidar tu salud ginecológica, incluidas las pruebas de tamizaje de cáncer de cuello uterino.',
 $md$Los controles ginecológicos ayudan a detectar a tiempo cambios que, en sus etapas iniciales, no suelen dar síntomas. Son una parte importante del cuidado de tu salud aunque te sientas bien.

Un control puede incluir:

- **Tamizaje de cáncer de cuello uterino**, con Papanicolaou (citología) o prueba del virus del papiloma humano (VPH), según tu edad y tus antecedentes.
- **Examen de mamas** y orientación sobre los controles que te corresponden.
- **Orientación** sobre vacunación contra el VPH, anticoncepción y salud sexual.

La Organización Mundial de la Salud señala que el cáncer de cuello uterino puede prevenirse en gran medida con la vacunación contra el VPH y con la detección y el tratamiento oportuno de las lesiones precancerosas.$md$,
 $md$Para quienes quieren hacer sus controles de rutina, aunque no tengan molestias. La frecuencia de los controles y el tipo de prueba dependen de tu edad, tus resultados anteriores y tus antecedentes: tu médico te indicará cuál te corresponde.$md$,
 $md$Primero conversarán sobre tus antecedentes y tus controles anteriores. Si corresponde una prueba de tamizaje, se toma una pequeña muestra del cuello uterino con ayuda de un espéculo: suele ser rápida y puede causar una molestia breve. Te indicarán cuándo y cómo recibirás los resultados.$md$,
 $md$Si tu control incluye Papanicolaou o prueba de VPH:

- Procura programarlo cuando no estés menstruando.
- Evita las duchas vaginales, las relaciones sexuales y los tampones o productos vaginales durante al menos las 24 horas previas.
- Si tuviste resultados anormales antes o podrías estar embarazada, avísalo al inicio de la consulta.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿Cada cuánto debo hacerme un control?',
     'a', 'Depende de tu edad, tus resultados anteriores y tus antecedentes. En la consulta te indicarán la frecuencia que te corresponde.'),
   jsonb_build_object('q', '¿Qué diferencia hay entre el Papanicolaou y la prueba de VPH?',
     'a', 'El Papanicolaou busca cambios en las células del cuello uterino; la prueba de VPH detecta el virus que puede causar esos cambios. Ambas se toman de forma parecida y tu médico te dirá cuál es la adecuada para ti.'),
   jsonb_build_object('q', '¿El Papanicolaou duele?',
     'a', 'Suele ser rápido. Puede causar una molestia o presión breve; si sientes dolor, avísalo y se puede detener.')),
 'Controles ginecológicos y Papanicolaou en Surco | OGYMED',
 'Controles ginecológicos y tamizaje de cáncer de cuello uterino en Santiago de Surco, Lima: qué incluyen y cómo prepararte.',
 20, 'medical_review', now()),

-- Ecografía ginecológica ------------------------------------------------------------------------------
('ecografia-ginecologica', 'Ecografía ginecológica', 'Diagnóstico',
 'Una prueba de imagen que permite ver el útero y los ovarios para estudiar síntomas o hacer seguimiento.',
 $md$La ecografía ginecológica usa ultrasonido para obtener imágenes del útero, los ovarios y otras estructuras de la pelvis. No usa radiación.

Puede realizarse de dos formas; tu médico te indicará cuál corresponde:

- **Transvaginal:** se introduce en la vagina un transductor delgado, cubierto con una funda y gel. Permite ver los órganos con más detalle.
- **Abdominal (pélvica):** el transductor se desliza sobre la parte baja del abdomen con un poco de gel.

Se indica, por ejemplo, para estudiar sangrados irregulares o dolor pélvico, o para el seguimiento de quistes o miomas.$md$,
 $md$Para quienes tienen una indicación médica de ecografía ginecológica, ya sea para estudiar un síntoma o para un control. Si no la tienes, en una consulta se valorará si la necesitas.$md$,
 $md$- Te pedirán que te quites la ropa de la cintura para abajo y te cubrirán con una sábana o bata.
- En la ecografía transvaginal, la mayoría de personas no siente dolor; puede haber una sensación de presión.
- En la abdominal, el gel puede sentirse frío.
- Al terminar, te explicarán los hallazgos o cuándo recibirás el informe.$md$,
 $md$- **Ecografía transvaginal:** generalmente se realiza con la vejiga vacía.
- **Ecografía abdominal:** suele requerir la vejiga llena; te indicarán cuánta agua tomar antes.
- Si te indicaron hacerla en un día concreto de tu ciclo, sigue esa indicación al pedir la cita.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿La ecografía transvaginal duele?',
     'a', 'Por lo general no duele; puede causar una sensación de presión. Si sientes molestias, avísalo y se puede ajustar o detener.'),
   jsonb_build_object('q', '¿Cuál de las dos necesito?',
     'a', 'Depende de lo que se quiera estudiar. Tu médico te indicará el tipo de ecografía y la preparación.')),
 'Ecografía ginecológica en Santiago de Surco | OGYMED',
 'Ecografía ginecológica transvaginal o abdominal en Santiago de Surco, Lima: para qué sirve, qué esperar y cómo prepararte.',
 30, 'medical_review', now()),

-- Colposcopia -----------------------------------------------------------------------------------------
('colposcopia', 'Colposcopia', 'Diagnóstico',
 'Un examen del cuello uterino con un instrumento de aumento, que suele indicarse tras un resultado anormal de Papanicolaou o de VPH.',
 $md$La colposcopia permite observar de cerca el cuello uterino, la vagina y la vulva con un colposcopio: un instrumento con luz y lentes de aumento que se coloca fuera del cuerpo.

Suele indicarse cuando un Papanicolaou o una prueba de VPH muestran un resultado que conviene estudiar mejor. Un resultado anormal no significa que tengas cáncer: la colposcopia ayuda a precisar qué está pasando y si hace falta algún tratamiento.

Durante el examen se aplica una solución (por ejemplo, de ácido acético) que hace más visibles las zonas que requieren atención. Si se observa alguna, puede tomarse una pequeña muestra (biopsia) para analizarla.$md$,
 $md$Para quienes tienen una indicación de colposcopia, generalmente después de un resultado anormal en el tamizaje de cáncer de cuello uterino o por otros hallazgos en el examen ginecológico.$md$,
 $md$- Te recostarás en la camilla, como en un examen ginecológico, y se colocará un espéculo.
- El colposcopio queda fuera del cuerpo; se aplica la solución y se observa el cuello uterino.
- Si se toma una biopsia, puedes sentir un pellizco o un cólico breve.
- Después puede haber un sangrado leve o un flujo oscuro durante unos días. Te indicarán los cuidados y cuándo tendrás los resultados.$md$,
 $md$- Procura que la cita no coincida con tu menstruación; si te baja, avísanos para reprogramarla.
- Durante las 24 a 48 horas previas evita las relaciones sexuales, las duchas vaginales, los tampones y los medicamentos o cremas vaginales, salvo indicación médica.
- Si podrías estar embarazada, avísalo antes del examen.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿La colposcopia duele?',
     'a', 'La mayoría de personas siente solo una molestia leve, parecida a la de un Papanicolaou. Si se toma una biopsia, puede haber un pellizco o un cólico breve.'),
   jsonb_build_object('q', '¿Un resultado anormal significa que tengo cáncer?',
     'a', 'No. En la mayoría de los casos se trata de cambios que pueden vigilarse o tratarse. La colposcopia sirve precisamente para estudiarlos mejor.'),
   jsonb_build_object('q', '¿Puedo hacer mis actividades después?',
     'a', 'Normalmente sí. Si te toman una biopsia, te indicarán los cuidados de los días siguientes.')),
 'Colposcopia en Santiago de Surco | OGYMED',
 'Colposcopia en Santiago de Surco, Lima: qué es, cuándo se indica, cómo prepararte y qué esperar del examen.',
 40, 'medical_review', now()),

-- Planificación familiar ------------------------------------------------------------------------------
('planificacion-familiar', 'Planificación familiar', 'Consultas',
 'Orientación para elegir el método anticonceptivo que mejor se adapte a tu salud, tus planes y tus preferencias.',
 $md$Elegir un método anticonceptivo es una decisión personal. En la consulta de planificación familiar se revisan contigo las opciones, cómo funciona cada una, su eficacia, sus posibles efectos y cuál encaja mejor con tu salud y tus planes.

Entre los métodos que pueden conversarse están:

- **Hormonales:** píldoras, inyectables, implante, parche o anillo vaginal.
- **Dispositivos intrauterinos (DIU):** de cobre u hormonales.
- **De barrera:** como el condón, que además es el único método que protege contra las infecciones de transmisión sexual.
- **Métodos permanentes**, para quienes no desean tener más hijos.
- **Anticoncepción de emergencia:** qué es y cuándo se usa.

También es el espacio para hablar de cuándo dejar un método si buscas un embarazo.$md$,
 $md$Para quienes quieren empezar, cambiar o dejar un método anticonceptivo, o resolver dudas sobre el que ya usan.$md$,
 $md$Tu médico te preguntará por tus antecedentes, tus preferencias y lo que esperas del método. Según el caso, puede hacer falta un examen o alguna prueba antes de iniciarlo. Si eliges un método que requiere colocación, como el DIU o el implante, te explicarán en qué consiste y cómo se coordina.$md$,
 $md$- Si usas o usaste antes algún método, anota cuál y cómo te fue.
- Lleva tus resultados recientes, si los tienes.
- Escribe tus dudas para no olvidarlas.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿Cuál es el método más eficaz?',
     'a', 'Los métodos de larga duración, como el DIU y el implante, están entre los más eficaces porque no dependen de recordarlos a diario. El mejor método para ti depende de tu salud y tus preferencias.'),
   jsonb_build_object('q', '¿Los anticonceptivos protegen contra las infecciones de transmisión sexual?',
     'a', 'Solo el condón protege contra las infecciones de transmisión sexual. Puede usarse junto con otro método.')),
 'Planificación familiar y anticonceptivos en Surco | OGYMED',
 'Orientación en planificación familiar en Santiago de Surco, Lima: métodos anticonceptivos, eficacia y cómo elegir el adecuado para ti.',
 50, 'medical_review', now()),

-- Menopausia ------------------------------------------------------------------------------------------
('menopausia', 'Menopausia', 'Consultas',
 'Acompañamiento durante la perimenopausia y la menopausia: síntomas, salud a largo plazo y opciones de tratamiento.',
 $md$La menopausia es la etapa en la que terminan las menstruaciones y los años fértiles; suele llegar entre los 45 y los 55 años. Antes se pasa por la perimenopausia, un periodo que puede durar varios años y que suele empezar con cambios en el ciclo menstrual.

En esta etapa son frecuentes:

- Bochornos y sudoración nocturna.
- Cambios en el ciclo antes de que las reglas terminen.
- Dificultades para dormir y cambios en el estado de ánimo.
- Sequedad vaginal o molestias en las relaciones sexuales.

No todas las personas tienen los mismos síntomas ni con la misma intensidad. En la consulta se revisa cómo te afectan y se conversan las opciones para aliviarlos, hormonales y no hormonales, valorando sus beneficios y riesgos en tu caso. También es un buen momento para revisar tu salud ósea y cardiovascular.$md$,
 $md$Para quienes notan cambios que podrían estar relacionados con la perimenopausia o la menopausia, o quieren informarse y prepararse para esta etapa.

Si tienes un sangrado después de llevar un año sin menstruar, consulta pronto.$md$,
 $md$Tu médico te preguntará por tus síntomas, tu ciclo y tus antecedentes. Según el caso, puede proponerte un examen o pruebas complementarias. Al final acordarán un plan, que puede incluir cambios en tus hábitos y, si corresponde, tratamiento.$md$,
 $md$- Anota tus síntomas, desde cuándo los tienes y la fecha de tu última menstruación.
- Lleva la lista de medicamentos o suplementos que tomas.$md$,
 jsonb_build_array(
   jsonb_build_object('q', '¿Cómo sé si estoy en la menopausia?',
     'a', 'Se considera que llegó la menopausia cuando pasan 12 meses seguidos sin menstruación, sin otra causa que lo explique. Tu médico te ayudará a interpretar tus síntomas.'),
   jsonb_build_object('q', '¿La terapia hormonal es para todas?',
     'a', 'No. Puede aliviar algunos síntomas, pero no es adecuada para todas las personas. Se decide de forma individual, valorando beneficios y riesgos.')),
 'Consulta de menopausia en Santiago de Surco | OGYMED',
 'Acompañamiento en perimenopausia y menopausia en Santiago de Surco, Lima: síntomas frecuentes, salud a largo plazo y tratamiento.',
 60, 'medical_review', now())
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------------------------------
-- 3. Preguntas frecuentes operativas → PUBLICADAS
--    Describen cómo funciona la web (verificado en el código), sin precios, seguros ni plazos sin confirmar.
-- -----------------------------------------------------------------------------------------------------
insert into public.faqs (question, answer_md, category, sort_order, status)
select v.q, v.a, v.c, v.o, 'published'
from (values
  ('¿Necesito crear una cuenta para pedir una cita?',
   'No. Solo te pedimos tu nombre y tus datos de contacto. Si reservas en línea, confirmamos tu correo con un código de seis dígitos.',
   'reservas', 10),
  ('¿Cómo sé que mi cita está confirmada?',
   'Cuando tu cita queda confirmada te enviamos un correo con la fecha, la hora y un enlace seguro para gestionarla. Si tu pedido necesita la revisión de recepción, verás el aviso «Solicitud recibida» y te escribiremos cuando la confirmemos.',
   'reservas', 20),
  ('¿Puedo cambiar o cancelar mi cita?',
   'Sí. Usa el enlace del correo de confirmación, dentro del plazo de nuestra política de citas. Si el plazo ya pasó, comunícate con recepción.',
   'reservas', 30),
  ('¿Qué datos me piden para agendar?',
   'Tu nombre, tu correo y, si quieres, tu teléfono. No te pedimos síntomas, diagnósticos ni documentos por la web: esa información se conversa en la consulta.',
   'general', 40),
  ('¿Por qué me piden un código de verificación?',
   'Para comprobar que el correo es tuyo antes de confirmar la cita. Así nadie puede reservar ni gestionar citas con tu correo.',
   'reservas', 50),
  ('¿Qué hago si no me llega el correo?',
   'Revisa la carpeta de correo no deseado o de promociones. El código tiene una validez limitada: si venció, pide uno nuevo desde la misma página. Si ya tienes una cita y perdiste el enlace, puedes pedir uno nuevo en [gestionar mi cita](/cita/gestionar).',
   'reservas', 60),
  ('¿En qué hora se muestran los horarios?',
   'Todos los horarios de la web están en hora de Lima (Perú).',
   'reservas', 70),
  ('¿Qué debo llevar a mi primera consulta?',
   'Te recomendamos llevar la lista de medicamentos que tomas y tus resultados anteriores si los tienes, y anotar la fecha de tu última menstruación y tus preguntas.',
   'visita', 80),
  ('¿Pueden darme indicaciones médicas por la web?',
   'No damos diagnósticos ni indicaciones personalizadas por la web. Si tienes una duda sobre tu salud, pide una cita. Ante una emergencia, acude al servicio de emergencias más cercano o llama al SAMU (106).',
   'general', 90)
) as v(q, a, c, o)
where not exists (select 1 from public.faqs f where f.question = v.q);

-- -----------------------------------------------------------------------------------------------------
-- 4. Blog → EN REVISIÓN MÉDICA (6 temas del calendario de docs/SEO_MAP.md)
--    Para publicar: un revisor médico habilitado y un profesional con perfil publicado como revisor.
--    Fuentes: notas descriptivas de la OMS y MedlinePlus en español (URLs comprobadas el 2026-10-27).
-- -----------------------------------------------------------------------------------------------------
insert into public.posts
  (slug, title, excerpt, body_md, author_name, references_list, related_service_ids, seo_title, seo_description, status, submitted_at)
values
('que-esperar-primera-consulta-ginecologica',
 'Qué esperar en tu primera consulta ginecológica',
 'Una guía práctica para llegar con tranquilidad a tu primera consulta: qué te preguntarán, qué exámenes pueden proponerte y cómo prepararte.',
 $md$Ir por primera vez a una consulta ginecológica puede generar dudas o nervios. Saber de antemano cómo suele desarrollarse ayuda a llegar con más tranquilidad y a aprovechar mejor el tiempo.

## ¿Cuándo conviene ir?

No hace falta tener síntomas para consultar. Muchas personas acuden para un control, para hablar de anticoncepción o para resolver dudas sobre su ciclo menstrual. También conviene consultar si notas cambios en tu menstruación, un flujo distinto al habitual, dolor pélvico o molestias en las relaciones sexuales.

## La conversación

La consulta suele empezar con preguntas sobre:

- El motivo de tu visita.
- Tu ciclo menstrual: cuándo fue tu última regla, cada cuánto te llega y cuántos días dura.
- Tus antecedentes de salud, cirugías, alergias y medicamentos.
- Tu vida sexual y el método anticonceptivo que usas, si corresponde.
- Los antecedentes de salud de tu familia.

Algunas preguntas son personales, pero sirven para entender tu situación. Tus respuestas forman parte de tu historia clínica y son confidenciales.

## ¿Siempre hay examen?

No siempre. Según el motivo de consulta, tu médico puede proponerte un examen de mamas, abdominal o ginecológico. En el examen ginecológico se observa la zona externa y, si hace falta, se usa un espéculo para ver el cuello uterino; también puede hacerse una palpación para valorar el útero y los ovarios.

Antes de cualquier examen te explicarán en qué consiste. Puedes hacer preguntas, pedir que se detenga en cualquier momento o consultar si puedes estar acompañada.

## Cómo prepararte

- Anota la fecha de tu última menstruación.
- Haz una lista de los medicamentos o suplementos que tomas.
- Lleva los resultados de controles anteriores, si los tienes.
- Escribe tus preguntas para no olvidarlas.

Si tu consulta incluye un Papanicolaou, procura que no coincida con tu menstruación y evita las duchas vaginales, las relaciones sexuales y los tampones durante al menos las 24 horas previas.

## Al terminar

Tu médico te explicará lo encontrado y, si hace falta, qué pruebas o tratamientos propone y cuándo volver. No te quedes con dudas: pregunta todo lo que necesites.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Prueba de Papanicolaou', 'url', 'https://medlineplus.gov/spanish/ency/article/003911.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Exámenes de detección para mujeres de 18 a 39 años', 'url', 'https://medlineplus.gov/spanish/ency/article/007462.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.')),
 array(select id from public.services where slug = 'consulta-ginecologica'),
 'Primera consulta ginecológica: qué esperar | OGYMED',
 'Qué te preguntarán, qué exámenes pueden proponerte y cómo prepararte para tu primera consulta ginecológica.',
 'medical_review', now()),

('papanicolaou-y-prueba-de-vph',
 'Papanicolaou y prueba de VPH: qué son y en qué se diferencian',
 'Las dos pruebas ayudan a prevenir el cáncer de cuello uterino, pero no buscan lo mismo. Te explicamos para qué sirve cada una y qué significan sus resultados.',
 $md$El cáncer de cuello uterino es uno de los cánceres que más pueden prevenirse. Según la Organización Mundial de la Salud (OMS), casi todos los casos se relacionan con una infección persistente por el virus del papiloma humano (VPH), y la vacunación, junto con las pruebas de detección y el tratamiento oportuno de las lesiones precancerosas, reduce mucho el riesgo.

Para detectar a tiempo esos cambios existen dos pruebas principales: el Papanicolaou y la prueba de VPH.

## El Papanicolaou (citología)

Busca **cambios en las células** del cuello uterino. Se toma una muestra con un pequeño cepillo o espátula, con ayuda de un espéculo, y se analiza al microscopio. Un resultado anormal indica que conviene estudiar mejor esas células; no es un diagnóstico de cáncer.

## La prueba de VPH

Busca la **presencia del virus**, en concreto de los tipos de alto riesgo, que son los que pueden causar esos cambios con el tiempo. La muestra se toma de forma muy parecida. La OMS recomienda la prueba de VPH como prueba principal de tamizaje a partir de los 30 años.

Tener VPH es muy frecuente y, en la mayoría de los casos, el cuerpo elimina la infección por sí solo. Un resultado positivo no significa que tengas cáncer: indica que necesitas seguimiento o pruebas adicionales.

## ¿Cuál necesito y cada cuánto?

Depende de tu edad, tus resultados anteriores y tus antecedentes, y las recomendaciones varían según la guía que se siga. Tu médico te indicará qué prueba te corresponde y cuándo repetirla.

## Cómo prepararte

- Procura que la prueba no coincida con tu menstruación.
- Evita las duchas vaginales, las relaciones sexuales y los tampones o productos vaginales durante al menos las 24 horas previas.
- Si tuviste resultados anormales antes o podrías estar embarazada, avísalo.

## Si el resultado no es normal

Lo habitual es repetir la prueba al cabo de un tiempo o realizar una colposcopia, un examen que permite ver el cuello uterino con aumento y, si hace falta, tomar una pequeña muestra. La mayoría de los cambios detectados pueden vigilarse o tratarse.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Cáncer de cuello uterino (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/cervical-cancer', 'publisher', 'Organización Mundial de la Salud'),
   jsonb_build_object('title', 'Papilomavirus humano y cáncer (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/human-papilloma-virus-and-cancer', 'publisher', 'Organización Mundial de la Salud'),
   jsonb_build_object('title', 'Prueba de Papanicolaou', 'url', 'https://medlineplus.gov/spanish/ency/article/003911.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Detección y prevención del cáncer de cuello uterino', 'url', 'https://medlineplus.gov/spanish/ency/patientinstructions/000419.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.')),
 array(select id from public.services where slug in ('prevencion-y-controles', 'colposcopia')),
 'Papanicolaou y prueba de VPH: diferencias | OGYMED',
 'Qué es el Papanicolaou, qué es la prueba de VPH, en qué se diferencian, cómo prepararte y qué significan sus resultados.',
 'medical_review', now()),

('como-prepararse-para-una-ecografia-ginecologica',
 'Cómo prepararte para una ecografía ginecológica',
 'Transvaginal o abdominal: en qué se diferencian, cómo es la preparación de cada una y qué vas a sentir durante el examen.',
 $md$La ecografía ginecológica es una prueba de imagen que usa ultrasonido para ver el útero, los ovarios y otras estructuras de la pelvis. Es una de las pruebas más usadas en ginecología porque es rápida y no usa radiación.

## Dos formas de hacerla

**Ecografía transvaginal.** Se introduce en la vagina un transductor delgado, cubierto con una funda y gel. Al estar más cerca de los órganos, da imágenes con más detalle. Se usa, por ejemplo, para estudiar sangrados anormales, dolor pélvico, quistes o miomas.

**Ecografía abdominal o pélvica.** El transductor se desliza sobre la parte baja del abdomen con un poco de gel. A veces se combina con la transvaginal en la misma visita.

Tu médico te indicará cuál necesitas según lo que se quiera estudiar.

## La preparación

- **Transvaginal:** suele hacerse con la vejiga vacía; te pedirán que orines antes.
- **Abdominal:** suele necesitar la vejiga llena, porque ayuda a ver mejor los órganos. Te indicarán cuánta agua tomar y con cuánta anticipación.
- Si te pidieron hacerla en un día concreto de tu ciclo menstrual, tenlo en cuenta al reservar.
- Usa ropa cómoda: te pedirán que te quites la ropa de la cintura para abajo y te cubrirán con una sábana o bata.

## ¿Duele?

La ecografía transvaginal por lo general no duele; puede causar una sensación de presión. La abdominal tampoco duele, aunque con la vejiga llena puede resultar incómoda. Si sientes molestias, avísalo: el examen puede ajustarse o detenerse.

## Los resultados

Al terminar te pueden explicar los hallazgos o indicarte cuándo recibirás el informe. Tu médico los interpretará junto con tus síntomas y tus antecedentes.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Ecografía trasvaginal', 'url', 'https://medlineplus.gov/spanish/ency/article/003779.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Ecografía pélvica abdominal', 'url', 'https://medlineplus.gov/spanish/ency/article/007667.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.')),
 array(select id from public.services where slug = 'ecografia-ginecologica'),
 'Cómo prepararte para una ecografía ginecológica | OGYMED',
 'Ecografía ginecológica transvaginal o abdominal: diferencias, preparación y qué vas a sentir durante el examen.',
 'medical_review', now()),

('que-es-una-colposcopia',
 'Colposcopia: qué es y por qué te la pueden indicar',
 'Si te indicaron una colposcopia tras un Papanicolaou o una prueba de VPH, te contamos en qué consiste, cómo prepararte y qué esperar después.',
 $md$Recibir un resultado anormal en un Papanicolaou o en una prueba de VPH puede preocupar. La colposcopia es el siguiente paso más habitual: un examen que permite ver el cuello uterino con detalle para saber qué está pasando.

## ¿Qué es?

Es un examen en el que se observa el cuello uterino, la vagina y la vulva con un colposcopio: un instrumento con luz y lentes de aumento que se coloca fuera del cuerpo, a cierta distancia.

## ¿Por qué se indica?

Sobre todo, cuando una prueba de tamizaje muestra cambios en las células o la presencia de tipos de VPH de alto riesgo. También puede indicarse si en el examen ginecológico se observa algo que conviene estudiar.

Un resultado anormal **no significa que tengas cáncer**. En la mayoría de los casos se trata de cambios que pueden vigilarse o tratarse a tiempo.

## ¿Cómo se hace?

1. Te recuestas en la camilla, como en un examen ginecológico, y se coloca un espéculo.
2. Se aplica una solución (por ejemplo, de ácido acético) que hace más visibles las zonas que requieren atención.
3. Se observa el cuello uterino con el colposcopio.
4. Si se ve alguna de esas zonas, se toma una pequeña muestra (biopsia) para analizarla en el laboratorio.

La mayoría de personas siente solo una molestia leve. La biopsia puede causar un pellizco o un cólico breve.

## Cómo prepararte

- Procura que la cita no coincida con tu menstruación.
- Durante las 24 a 48 horas previas, evita las relaciones sexuales, las duchas vaginales, los tampones y los medicamentos o cremas vaginales, salvo indicación médica.
- Avisa si podrías estar embarazada.

## Después del examen

Si te tomaron una biopsia, es normal tener un sangrado leve o un flujo oscuro durante unos días. Tu médico te indicará los cuidados y cuándo tendrás los resultados. Consulta si tienes un sangrado abundante, fiebre o dolor intenso.

Con los resultados, tu médico te explicará si basta con hacer controles o si conviene algún tratamiento.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Biopsia dirigida por colposcopia', 'url', 'https://medlineplus.gov/spanish/ency/article/003913.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Displasia cervical', 'url', 'https://medlineplus.gov/spanish/ency/article/001491.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Cáncer de cuello uterino (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/cervical-cancer', 'publisher', 'Organización Mundial de la Salud')),
 array(select id from public.services where slug in ('colposcopia', 'prevencion-y-controles')),
 'Colposcopia: qué es y por qué se indica | OGYMED',
 'Qué es una colposcopia, por qué se indica tras un Papanicolaou o una prueba de VPH, cómo prepararte y qué esperar después.',
 'medical_review', now()),

('como-elegir-metodo-anticonceptivo',
 'Métodos anticonceptivos: cómo elegir el adecuado para ti',
 'No hay un método ideal para todas las personas. Repasamos los tipos de anticonceptivos y las preguntas que ayudan a elegir con tu médico.',
 $md$Hay muchos métodos anticonceptivos y ninguno es el mejor para todas las personas. El adecuado para ti depende de tu salud, de tus planes y de lo que te resulte cómodo en el día a día.

## Los principales tipos

- **Hormonales de corta duración:** píldoras, inyectables, parche y anillo vaginal. Funcionan bien si se usan de forma correcta y constante.
- **De larga duración:** el implante y los dispositivos intrauterinos (DIU), de cobre u hormonales. Duran varios años, se pueden retirar cuando quieras y están entre los más eficaces, porque no dependen de acordarse cada día.
- **De barrera:** el condón masculino y el femenino. El condón es el único método que, además de prevenir el embarazo, protege contra las infecciones de transmisión sexual, incluido el VIH.
- **Permanentes:** la ligadura de trompas y la vasectomía, para quienes no desean tener más hijos.
- **Basados en el conocimiento de la fertilidad:** requieren mucha constancia y son menos eficaces que los anteriores.

La **anticoncepción de emergencia** se usa después de una relación sin protección o si falló el método. No está pensada como método habitual.

## Preguntas que ayudan a elegir

- ¿Cuándo te gustaría tener hijos, si es que quieres tenerlos?
- ¿Prefieres un método que no tengas que recordar a diario?
- ¿Tienes alguna condición de salud, tomas medicamentos o fumas?
- ¿Cómo te fue con métodos anteriores?
- ¿Necesitas también protección frente a infecciones de transmisión sexual?

Algunas condiciones de salud hacen que ciertos métodos no sean recomendables. Por eso conviene elegir con tu médico, que valorará tus antecedentes con criterios reconocidos, como los de la OMS.

## Cambiar de método

Si un método no te convence o te produce molestias, no lo dejes por tu cuenta sin otra protección: consulta para cambiarlo de forma segura.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Planificación familiar/métodos anticonceptivos (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/family-planning-contraception', 'publisher', 'Organización Mundial de la Salud'),
   jsonb_build_object('title', 'Dispositivos intrauterinos (DIU) (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/intrauterine-devices', 'publisher', 'Organización Mundial de la Salud'),
   jsonb_build_object('title', 'Control natal y planificación familiar', 'url', 'https://medlineplus.gov/spanish/ency/article/001946.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Anticonceptivo de emergencia', 'url', 'https://medlineplus.gov/spanish/ency/article/007014.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.')),
 array(select id from public.services where slug = 'planificacion-familiar'),
 'Cómo elegir un método anticonceptivo | OGYMED',
 'Tipos de métodos anticonceptivos y preguntas que ayudan a elegir el adecuado para ti junto con tu médico.',
 'medical_review', now()),

('perimenopausia-y-menopausia',
 'Perimenopausia y menopausia: cambios frecuentes y cuándo consultar',
 'Qué ocurre en el cuerpo en esta etapa, qué síntomas son habituales y en qué situaciones conviene pedir una consulta.',
 $md$La menopausia es una etapa natural de la vida: marca el final de las menstruaciones y de los años fértiles. Según la Organización Mundial de la Salud (OMS), la mayoría de las mujeres la atraviesa entre los 45 y los 55 años.

## Perimenopausia y menopausia no son lo mismo

- **Perimenopausia:** es la transición. Empieza con los primeros cambios, habitualmente en el ciclo menstrual, y llega hasta un año después de la última regla. Puede durar varios años.
- **Menopausia:** se confirma cuando pasan 12 meses seguidos sin menstruación, sin otra causa que lo explique.

Estos cambios se deben a que los ovarios dejan de funcionar de forma gradual y bajan los niveles de estrógenos.

## Cambios frecuentes

- Reglas irregulares, más o menos abundantes, antes de que desaparezcan.
- Bochornos y sudoración nocturna.
- Dificultades para dormir.
- Cambios en el estado de ánimo, irritabilidad o ansiedad.
- Sequedad vaginal y molestias en las relaciones sexuales.
- Cambios en el deseo sexual.

Cada persona vive esta etapa de forma distinta: algunas casi no notan síntomas y otras sienten que afectan su vida diaria.

## Opciones para aliviar los síntomas

Existen tratamientos hormonales y no hormonales. La terapia hormonal puede aliviar los bochornos y la sequedad vaginal, pero no es adecuada para todas las personas: se decide de forma individual, valorando beneficios y riesgos. Los hábitos también ayudan: actividad física, alimentación equilibrada, buen descanso y no fumar.

## Salud a largo plazo

Tras la menopausia aumenta el riesgo de osteoporosis y de enfermedad cardiovascular. Es un buen momento para revisar tu salud ósea y cardiovascular con tu médico.

## Cuándo consultar

- Si los síntomas afectan tu sueño, tu trabajo o tu bienestar.
- Si tienes un sangrado después de llevar un año sin menstruar.
- Si tus reglas desaparecen antes de los 40 años.
- Si quieres conocer las opciones de tratamiento o tienes dudas sobre esta etapa.

*Este artículo es informativo y no sustituye una consulta médica.*$md$,
 'Equipo OGYMED',
 jsonb_build_array(
   jsonb_build_object('title', 'Menopausia (nota descriptiva)', 'url', 'https://www.who.int/es/news-room/fact-sheets/detail/menopause', 'publisher', 'Organización Mundial de la Salud'),
   jsonb_build_object('title', 'Menopausia', 'url', 'https://medlineplus.gov/spanish/ency/article/000894.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.'),
   jsonb_build_object('title', 'Manejo de la menopausia en casa', 'url', 'https://medlineplus.gov/spanish/ency/patientinstructions/000392.htm', 'publisher', 'MedlinePlus, Biblioteca Nacional de Medicina de EE. UU.')),
 array(select id from public.services where slug = 'menopausia'),
 'Perimenopausia y menopausia: cuándo consultar | OGYMED',
 'Qué cambia en la perimenopausia y la menopausia, qué síntomas son frecuentes, opciones de tratamiento y cuándo consultar.',
 'medical_review', now())
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------------------------------
-- 5. Publicación: snapshots públicos de lo marcado como publicado (igual que cms_transition) + historial
-- -----------------------------------------------------------------------------------------------------
with nuevas as (
  insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
  select 'page', p.id, private.page_path(p.kind), null, private.build_snapshot('page', p.id), 100, false
  from public.pages p
  where p.status = 'published' and not p.is_demo
    and not exists (select 1 from public.published_content pc where pc.entity_type = 'page' and pc.entity_id = p.id)
  returning entity_type, entity_id, data
)
insert into public.content_revisions (entity_type, entity_id, reason, snapshot)
select entity_type, entity_id, 'publish', data from nuevas;

with nuevas as (
  insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
  select 'faq', f.id, null, null, private.build_snapshot('faq', f.id), f.sort_order, false
  from public.faqs f
  where f.status = 'published' and not f.is_demo
    and not exists (select 1 from public.published_content pc where pc.entity_type = 'faq' and pc.entity_id = f.id)
  returning entity_type, entity_id, data
)
insert into public.content_revisions (entity_type, entity_id, reason, snapshot)
select entity_type, entity_id, 'publish', data from nuevas;

select private.audit('content.initial_load', 'content', null,
  jsonb_build_object('source', 'supabase/content/contenido-inicial.sql'), 'system');

commit;

-- Resumen (debería mostrar: 7 páginas publicadas, 1 en revisión médica, 5 borradores legales,
-- 6 servicios y 6 artículos en revisión médica y 9 preguntas publicadas, más lo que ya existiera).
select 'páginas' as tipo, status::text as estado, count(*) from public.pages group by status
union all select 'servicios', status::text, count(*) from public.services group by status
union all select 'artículos', status::text, count(*) from public.posts group by status
union all select 'preguntas', status::text, count(*) from public.faqs group by status
order by 1, 2;
