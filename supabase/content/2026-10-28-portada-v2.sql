-- =====================================================================================================
-- OGYMED · Actualización de contenido 2026-10-28: textos de la nueva portada
-- =====================================================================================================
-- Supabase → SQL Editor → pegar este archivo → Run. Después, en el panel: Contenido → «Actualizar la web
-- ahora». Idempotente y prudente: sólo cambia la portada si conserva el texto de la carga inicial (si el
-- equipo ya la editó en el panel, no se toca). La versión anterior queda en el historial («Restaurar»).
--
-- 1. Portada: antetítulo «Ginecología en Surco, Lima», título «Tu salud merece tiempo y atención.» y
--    texto «Conoce nuestros servicios y coordina tu próxima visita.». Se retiran los destacados («Sin crear
--    una cuenta», «Solo lo necesario», «Información revisada»): su información vive en reserva y FAQ.
-- 2. Nueva pregunta frecuente publicada sobre la revisión de los contenidos de salud.
-- =====================================================================================================

begin;

do $$
declare
  v_id uuid;
  v_status public.content_status;
begin
  select id, status into v_id, v_status
  from public.pages
  where kind = 'home' and not is_demo
    and sections ->> 'hero_title' = 'Atención ginecológica en Santiago de Surco';
  if v_id is null then
    raise notice 'La portada ya fue editada o no existe: no se modifica.';
    return;
  end if;

  update public.pages
  set sections = jsonb_build_object(
    'hero_kicker', 'Ginecología en Surco, Lima',
    'hero_title', 'Tu salud merece tiempo y atención.',
    'hero_text', 'Conoce nuestros servicios y coordina tu próxima visita.')
  where id = v_id;

  -- Editar algo publicado lo deja en borrador (trigger); se vuelve a publicar con su snapshot nuevo.
  if v_status = 'published' then
    update public.pages set status = 'published' where id = v_id;
    update public.published_content
      set data = private.build_snapshot('page', v_id), updated_at = now()
      where entity_type = 'page' and entity_id = v_id;
    insert into public.content_revisions (entity_type, entity_id, reason, snapshot)
      values ('page', v_id, 'publish', private.build_snapshot('page', v_id));
  end if;
end;
$$;

with nueva as (
  insert into public.faqs (question, answer_md, category, sort_order, status)
  select '¿Quién revisa la información de salud de esta web?',
         'Los contenidos de salud (servicios, artículos y la guía de primera visita) se publican solo después de la revisión de un profesional de nuestro equipo. En cada página verás la fecha de esa revisión.',
         'general', 95, 'published'
  where not exists (select 1 from public.faqs where question = '¿Quién revisa la información de salud de esta web?')
  returning id, sort_order
),
snap as (
  insert into public.published_content (entity_type, entity_id, path, slug, data, sort_order, is_demo)
  select 'faq', n.id, null, null, private.build_snapshot('faq', n.id), n.sort_order, false from nueva n
  returning entity_type, entity_id, data
)
insert into public.content_revisions (entity_type, entity_id, reason, snapshot)
select entity_type, entity_id, 'publish', data from snap;

select private.audit('content.update', 'content', null,
  jsonb_build_object('source', 'supabase/content/2026-10-28-portada-v2.sql'), 'system');

commit;

select kind, status, sections ->> 'hero_title' as titulo from public.pages where kind = 'home';
