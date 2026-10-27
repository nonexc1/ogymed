-- OGYMED · DATOS DE DEMOSTRACIÓN SÓLO PARA DESARROLLO LOCAL.
-- Se cargan únicamente con `supabase db reset` en local. Nunca ejecutar en producción.
-- Todo está marcado is_demo = true y con «[DEMO]». No contiene datos reales de OGYMED:
-- sin CMP/RNE, sin teléfonos, sin direcciones, sin afirmaciones clínicas.

-- Parámetros de agenda para poder probar el flujo completo en local.
update public.clinic_settings_public set booking_mode = 'automatic' where id;
update public.clinic_settings_private set reception_notification_email = 'recepcion@example.test' where id;

-- Profesionales ficticios (sin CMP: un número inventado podría pertenecer a una persona real).
insert into public.doctors (id, slug, honorific, full_name, specialty, credentials_verified, bio_md, sort_order, status, is_demo) values
  ('00000000-0000-4000-8000-00000000d001', 'profesional-demo-a', 'Dra.', 'Profesional Demo A', 'Ginecología (dato de ejemplo)', true,
   '[DEMO] Perfil ficticio para desarrollo. Aquí irá la biografía real, revisada por la profesional.', 10, 'published', true),
  ('00000000-0000-4000-8000-00000000d002', 'profesional-demo-b', 'Dra.', 'Profesional Demo B', 'Ginecología (dato de ejemplo)', true,
   '[DEMO] Perfil ficticio para desarrollo. Aquí irá la biografía real, revisada por la profesional.', 20, 'published', true);

-- Servicios: los candidatos del encargo, sólo como borradores demo (no son afirmaciones de oferta).
insert into public.services (id, slug, name, category, summary, body_md, audience_md, what_to_expect_md, preparation_md, faqs, sort_order, status, is_demo)
select v.id::uuid, v.slug, v.name, v.category,
  '[DEMO] Resumen de ejemplo. Pendiente de redacción por OGYMED.',
  '[DEMO] Texto de ejemplo para probar la plantilla. **Pendiente de redacción y revisión médica.** No describe la oferta real de la clínica.',
  '[DEMO] A quién se dirige: pendiente.',
  '[DEMO] Qué esperar: pendiente.',
  '',
  '[{"q":"[DEMO] ¿Pregunta de ejemplo?","a":"[DEMO] Respuesta de ejemplo pendiente de revisión."}]'::jsonb,
  v.sort, 'published', true
from (values
  ('00000000-0000-4000-8000-00000000a001', 'consulta-ginecologica', 'Consulta ginecológica', 'Consultas', 10),
  ('00000000-0000-4000-8000-00000000a002', 'prevencion-y-controles', 'Prevención y controles', 'Consultas', 20),
  ('00000000-0000-4000-8000-00000000a003', 'ecografia-ginecologica', 'Ecografía ginecológica', 'Procedimientos', 30),
  ('00000000-0000-4000-8000-00000000a004', 'colposcopia', 'Colposcopia', 'Procedimientos', 40),
  ('00000000-0000-4000-8000-00000000a005', 'planificacion-familiar', 'Planificación familiar', 'Consultas', 50),
  ('00000000-0000-4000-8000-00000000a006', 'menopausia', 'Menopausia', 'Consultas', 60)
) as v(id, slug, name, category, sort);

update public.services set medical_reviewed_at = now() where is_demo;

-- Combinaciones profesional-servicio con duraciones de ejemplo.
insert into public.doctor_services (doctor_id, service_id, duration_minutes, buffer_after_minutes) values
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000a001', 30, 0),
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000a002', 30, 0),
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000a003', 30, 10),
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000a005', 30, 0),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-00000000a001', 30, 0),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-00000000a004', 45, 15),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-00000000a006', 30, 0);

-- Horarios de ejemplo (L–V 09:00–13:00 y 15:00–19:00, sábados 09:00–12:00), hora de Lima.
insert into public.schedule_rules (doctor_id, weekday, start_time, end_time, slot_interval_minutes, valid_from)
select d.id, w.day, b.s, b.e, 30, current_date - 1
from (values ('00000000-0000-4000-8000-00000000d001'::uuid), ('00000000-0000-4000-8000-00000000d002'::uuid)) d(id)
cross join generate_series(1, 5) w(day)
cross join (values ('09:00'::time, '13:00'::time), ('15:00'::time, '19:00'::time)) b(s, e);
insert into public.schedule_rules (doctor_id, weekday, start_time, end_time, slot_interval_minutes, valid_from)
values ('00000000-0000-4000-8000-00000000d001', 6, '09:00', '12:00', 30, current_date - 1);

-- Páginas: plantillas demo. Los textos legales son BORRADORES sin validez: requieren asesoría local.
insert into public.pages (kind, title, intro, body_md, sections, requires_medical_review, document_version, status, is_demo) values
  ('home', 'Clínica ginecológica en Santiago de Surco', '[DEMO] Texto de portada pendiente de OGYMED.', '',
   '{"hero_kicker":"Clínica ginecológica · Santiago de Surco"}'::jsonb, false, null, 'published', true),
  ('clinic', 'La clínica', '[DEMO] Presentación pendiente.',
   '[DEMO] Aquí irá la identidad, el enfoque asistencial, las instalaciones reales y la accesibilidad física de la sede, con datos verificados por OGYMED.',
   '{}'::jsonb, false, null, 'published', true),
  ('first_visit', 'Tu primera visita', '[DEMO] Información pendiente de confirmación por el equipo médico.',
   '[DEMO] Documentos, preparación y acompañamiento: pendientes de confirmación. No se incluyen recomendaciones clínicas inventadas.',
   '{}'::jsonb, true, null, 'published', true),
  ('faq', 'Preguntas frecuentes', 'Respuestas sobre reservas y visitas.', '', '{}'::jsonb, false, null, 'published', true),
  ('contact', 'Contacto', '', '', '{}'::jsonb, false, null, 'published', true),
  ('privacy', 'Política de privacidad', 'BORRADOR DE DESARROLLO — requiere validación legal.',
   E'**[DEMO] Borrador sin validez legal.** Estructura prevista (ver docs/PRIVACY_REVIEW.md):\n\n## Responsable del tratamiento\n[RAZÓN SOCIAL], RUC [RUC], [DIRECCIÓN].\n\n## Datos que tratamos\nNombre, correo y teléfono para gestionar tu cita.\n\n## Finalidades\n...\n\n## Derechos\n...',
   '{}'::jsonb, false, 'demo-0', 'published', true),
  ('cookies', 'Política de cookies', 'BORRADOR DE DESARROLLO — requiere validación legal.', '[DEMO] Texto pendiente. La tabla inferior refleja las cookies que el sitio usa realmente.', '{}'::jsonb, false, 'demo-0', 'published', true),
  ('terms', 'Términos y condiciones', 'BORRADOR DE DESARROLLO — requiere validación legal.', '[DEMO] Texto pendiente.', '{}'::jsonb, false, 'demo-0', 'published', true),
  ('booking_policy', 'Política de citas', 'BORRADOR DE DESARROLLO — pendiente de definición por OGYMED.',
   '[DEMO] Plazo de cancelación y reprogramación configurado en el panel (por defecto 24 horas). Texto pendiente.', '{}'::jsonb, false, 'demo-0', 'published', true);
update public.pages set medical_reviewed_at = now() where kind = 'first_visit' and is_demo;

-- FAQs operativas de ejemplo (describen el funcionamiento del sitio, no datos clínicos).
insert into public.faqs (question, answer_md, category, sort_order, status, is_demo) values
  ('[DEMO] ¿Necesito crear una cuenta para reservar?', 'No. Verificamos tu correo con un código y te enviamos un enlace seguro para gestionar tu cita.', 'reservas', 10, 'published', true),
  ('[DEMO] ¿En qué zona horaria se muestran los horarios?', 'Todos los horarios se muestran en hora de Lima.', 'reservas', 20, 'published', true),
  ('[DEMO] ¿Puedo cambiar o cancelar mi cita?', 'Sí, desde el enlace de tu correo y dentro del plazo de la política de citas. Fuera de plazo, contacta a recepción.', 'reservas', 30, 'published', true);

-- Artículo demo (revisor = profesional demo publicado).
insert into public.posts (slug, title, excerpt, body_md, author_name, reviewer_doctor_id, references_list, status, is_demo) values
  ('articulo-de-ejemplo', '[DEMO] Artículo de ejemplo para la plantilla del blog', '[DEMO] Extracto de ejemplo.',
   '[DEMO] Este artículo sólo prueba la plantilla. **No contiene información médica.**', 'Equipo OGYMED (demo)',
   '00000000-0000-4000-8000-00000000d001', '[]'::jsonb, 'published', true);
update public.posts set medical_reviewed_at = now() where is_demo;

-- Materializa snapshots públicos (en producción esto lo hace cms_transition con su flujo editorial).
insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
select 'doctor', id, '/equipo/' || slug, slug, private.build_snapshot('doctor', id), sort_order, true from public.doctors where is_demo;
insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
select 'service', id, '/servicios/' || slug, slug, private.build_snapshot('service', id), sort_order, true from public.services where is_demo;
insert into public.published_content (entity_type, entity_id, path, slug, data, is_demo)
select 'page', id, private.page_path(kind), null, private.build_snapshot('page', id), true from public.pages where is_demo;
insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
select 'faq', id, null, null, private.build_snapshot('faq', id), sort_order, true from public.faqs where is_demo;
insert into public.published_content (entity_type, entity_id, path, slug, data, is_demo)
select 'post', id, '/blog/' || slug, slug, private.build_snapshot('post', id), true from public.posts where is_demo;
