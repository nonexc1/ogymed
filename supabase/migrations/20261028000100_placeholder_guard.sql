-- OGYMED · 0006 · Nada con campos «[COMPLETAR …]» puede publicarse.
--
-- Los borradores iniciales (supabase/content/contenido-inicial.sql) marcan con «[COMPLETAR: …]» los datos
-- que sólo OGYMED puede aportar (razón social, RUC, plazos…). Este trigger impide que lleguen a la web por
-- cualquier vía de publicación. Idempotente: puede ejecutarse más de una vez.

create or replace function private.published_content_no_placeholders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if strpos(new.data::text, '[COMPLETAR') > 0 then
    raise exception 'placeholder_pending: completa los campos [COMPLETAR] antes de publicar' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists published_content_no_placeholders on public.published_content;
create trigger published_content_no_placeholders before insert or update on public.published_content
  for each row execute function private.published_content_no_placeholders();
