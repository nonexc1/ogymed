-- OGYMED · 0003 · CMS: páginas, publicaciones, FAQs, publicación por snapshot, historial y redirecciones.
--
-- Modelo: cada entidad editorial tiene una COPIA DE TRABAJO (tablas doctors, services, pages, posts, faqs)
-- y, si está publicada, un SNAPSHOT público en published_content. El rol anónimo sólo lee
-- published_content: nunca borradores. Editar una entidad publicada deja el snapshot en línea y
-- marca la copia de trabajo como 'draft' (cambios sin publicar) hasta que se vuelva a publicar.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  kind text not null unique check (kind in (
    'home', 'clinic', 'first_visit', 'faq', 'contact', 'services_index', 'team_index', 'blog_index',
    'privacy', 'cookies', 'terms', 'booking_policy', 'complaints'
  )),
  title text not null check (char_length(title) between 2 and 120),
  intro text not null default '' check (char_length(intro) <= 600),
  body_md text not null default '' check (char_length(body_md) <= 40000),
  -- Secciones estructuradas validadas por la aplicación (Zod) según `kind`.
  sections jsonb not null default '{}'::jsonb check (jsonb_typeof(sections) = 'object'),
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  og_media_id uuid references public.media_assets (id) on delete set null,
  requires_medical_review boolean not null default false,
  -- Versión del documento (p. ej. política de privacidad) registrada en consentimientos.
  document_version text check (char_length(document_version) <= 40),
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  medical_reviewed_by uuid references auth.users (id) on delete set null,
  medical_reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pages_touch before update on public.pages
  for each row execute function private.touch_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  title text not null check (char_length(title) between 5 and 140),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  body_md text not null default '' check (char_length(body_md) <= 60000),
  cover_media_id uuid references public.media_assets (id) on delete set null,
  author_doctor_id uuid references public.doctors (id) on delete set null,
  author_name text check (char_length(author_name) <= 120),
  reviewer_doctor_id uuid references public.doctors (id) on delete set null,
  -- [{ "title": "...", "url": "https://...", "publisher": "...", "year": 2024 }]
  references_list jsonb not null default '[]'::jsonb check (jsonb_typeof(references_list) = 'array'),
  related_service_ids uuid[] not null default '{}',
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  og_media_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  medical_reviewed_by uuid references auth.users (id) on delete set null,
  medical_reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (author_doctor_id is not null or author_name is not null)
);
create trigger posts_touch before update on public.posts
  for each row execute function private.touch_updated_at();

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 200),
  answer_md text not null check (char_length(answer_md) between 2 and 4000),
  category text not null default 'general' check (category in ('general', 'reservas', 'visita', 'pagos', 'ubicacion')),
  sort_order integer not null default 100,
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faqs_touch before update on public.faqs
  for each row execute function private.touch_updated_at();

-- Snapshot público de lo publicado. Única superficie de contenido legible por anon.
create table public.published_content (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('page', 'service', 'doctor', 'post', 'faq')),
  entity_id uuid not null,
  path text unique check (path ~ '^/'),
  slug text,
  data jsonb not null,
  sort_order integer not null default 100,
  is_demo boolean not null default false,
  first_published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);
create index published_content_type_idx on public.published_content (entity_type, sort_order);

create table public.content_revisions (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  reason text not null check (reason in ('update', 'publish', 'restore')),
  snapshot jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index content_revisions_entity_idx on public.content_revisions (entity_type, entity_id, created_at desc);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/[^?#]*$' and char_length(from_path) <= 300),
  to_path text not null check (to_path ~ '^/[^?#]*$' and char_length(to_path) <= 300),
  source text not null default 'manual' check (source in ('auto', 'manual')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_path <> to_path)
);

-- Detección de bucles: tras insertar/actualizar no puede existir un ciclo.
create or replace function private.redirects_check_loop()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_path text := new.to_path;
  v_hops integer := 0;
begin
  loop
    if v_path = new.from_path then
      raise exception 'redirect_loop: % → % forma un ciclo', new.from_path, new.to_path using errcode = '23514';
    end if;
    select r.to_path into v_path from public.redirects r where r.from_path = v_path and r.id <> new.id;
    exit when not found;
    v_hops := v_hops + 1;
    if v_hops > 20 then
      raise exception 'redirect_chain_too_long' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
create trigger redirects_loop before insert or update on public.redirects
  for each row execute function private.redirects_check_loop();

-- ---------------------------------------------------------------------------
-- Columnas de flujo (no cuentan como cambio de contenido).
-- ---------------------------------------------------------------------------
create or replace function private.content_meta_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'status', 'submitted_by', 'submitted_at', 'medical_reviewed_by', 'medical_reviewed_at',
    'updated_at', 'created_at', 'credentials_verified_at', 'credentials_verified_by',
    'active', 'online_booking_enabled'
  ];
$$;

-- Editar contenido de algo publicado o en revisión lo devuelve a borrador y anula la revisión.
create or replace function private.content_on_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - private.content_meta_columns()) is distinct from (to_jsonb(old) - private.content_meta_columns()) then
    if old.status in ('published', 'medical_review') and new.status = old.status then
      new := jsonb_populate_record(new, jsonb_build_object(
        'status', 'draft', 'medical_reviewed_at', null, 'medical_reviewed_by', null
      ));
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.content_revision_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (to_jsonb(new) - private.content_meta_columns()) is distinct from (to_jsonb(old) - private.content_meta_columns()) then
    insert into public.content_revisions (entity_type, entity_id, reason, snapshot, created_by)
    values (tg_argv[0], old.id, 'update', to_jsonb(old), (select auth.uid()));
  end if;
  return null;
end;
$$;

create trigger services_on_edit before update on public.services for each row execute function private.content_on_edit();
create trigger doctors_on_edit before update on public.doctors for each row execute function private.content_on_edit();
create trigger pages_on_edit before update on public.pages for each row execute function private.content_on_edit();
create trigger posts_on_edit before update on public.posts for each row execute function private.content_on_edit();
create trigger faqs_on_edit before update on public.faqs for each row execute function private.content_on_edit();

create trigger services_revision after update on public.services for each row execute function private.content_revision_on_update('service');
create trigger doctors_revision after update on public.doctors for each row execute function private.content_revision_on_update('doctor');
create trigger pages_revision after update on public.pages for each row execute function private.content_revision_on_update('page');
create trigger posts_revision after update on public.posts for each row execute function private.content_revision_on_update('post');
create trigger faqs_revision after update on public.faqs for each row execute function private.content_revision_on_update('faq');

-- ---------------------------------------------------------------------------
-- Construcción de snapshots públicos
-- ---------------------------------------------------------------------------
create or replace function private.media_json(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.media_assets;
begin
  if p_id is null then
    return null;
  end if;
  select * into m from public.media_assets where id = p_id;
  if not found then
    return null;
  end if;
  if not m.rights_confirmed then
    raise exception 'media_rights_unconfirmed: confirma los derechos de uso de la imagen %', m.id using errcode = '23514';
  end if;
  if char_length(trim(m.alt_text)) = 0 then
    raise exception 'media_alt_missing: la imagen % necesita texto alternativo', m.id using errcode = '23514';
  end if;
  return jsonb_build_object('bucket', m.bucket, 'path', m.path, 'alt', m.alt_text,
    'width', m.width, 'height', m.height, 'is_demo', m.is_demo);
end;
$$;

create or replace function private.page_path(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'home' then '/'
    when 'clinic' then '/la-clinica'
    when 'first_visit' then '/primera-visita'
    when 'faq' then '/preguntas-frecuentes'
    when 'contact' then '/contacto'
    when 'services_index' then '/servicios'
    when 'team_index' then '/equipo'
    when 'blog_index' then '/blog'
    when 'privacy' then '/privacidad'
    when 'cookies' then '/cookies'
    when 'terms' then '/terminos'
    when 'booking_policy' then '/politica-de-citas'
    when 'complaints' then '/libro-de-reclamaciones'
  end;
$$;

create or replace function private.reviewer_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(trim(both ' ' from coalesce(d.honorific, '') || ' ' || d.full_name), p.display_name)
  from public.staff_profiles p
  left join public.doctors d on d.id = p.doctor_id
  where p.user_id = p_user;
$$;

create or replace function private.doctor_public_ref(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('id', pc.entity_id, 'slug', pc.slug,
    'name', pc.data ->> 'display_name')
  from public.published_content pc
  where pc.entity_type = 'doctor' and pc.entity_id = p_id;
$$;

create or replace function private.build_snapshot(p_type text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.services;
  d public.doctors;
  pg public.pages;
  po public.posts;
  f public.faqs;
  v_durations jsonb;
begin
  if p_type = 'service' then
    select * into s from public.services where id = p_id;
    select jsonb_build_object('min', min(ds.duration_minutes), 'max', max(ds.duration_minutes))
      into v_durations from public.doctor_services ds where ds.service_id = s.id and ds.active;
    return jsonb_build_object(
      'slug', s.slug, 'name', s.name, 'category', s.category, 'summary', s.summary,
      'body_md', s.body_md, 'audience_md', s.audience_md, 'what_to_expect_md', s.what_to_expect_md,
      'preparation_md', s.preparation_md, 'faqs', s.faqs,
      'price_pen', case when s.price_approved then s.price_pen end,
      'duration', case when s.show_duration then v_durations end,
      'hero', private.media_json(s.hero_media_id),
      'medical_reviewed_at', s.medical_reviewed_at,
      'medical_reviewer', private.reviewer_name(s.medical_reviewed_by),
      'seo', jsonb_build_object('title', s.seo_title, 'description', s.seo_description, 'og', private.media_json(s.og_media_id)),
      'is_demo', s.is_demo
    );
  elsif p_type = 'doctor' then
    select * into d from public.doctors where id = p_id;
    return jsonb_build_object(
      'slug', d.slug, 'honorific', d.honorific, 'full_name', d.full_name,
      'display_name', trim(both ' ' from coalesce(d.honorific, '') || ' ' || d.full_name),
      'specialty', d.specialty,
      'cmp_number', case when d.credentials_verified then d.cmp_number end,
      'rne_number', case when d.credentials_verified then d.rne_number end,
      'credentials_verified_at', d.credentials_verified_at,
      'bio_md', d.bio_md, 'background_md', d.background_md,
      'photo', private.media_json(d.photo_media_id),
      'service_ids', coalesce((select jsonb_agg(ds.service_id) from public.doctor_services ds
                               where ds.doctor_id = d.id and ds.active), '[]'::jsonb),
      'seo', jsonb_build_object('title', d.seo_title, 'description', d.seo_description, 'og', private.media_json(d.og_media_id)),
      'is_demo', d.is_demo
    );
  elsif p_type = 'page' then
    select * into pg from public.pages where id = p_id;
    return jsonb_build_object(
      'kind', pg.kind, 'title', pg.title, 'intro', pg.intro, 'body_md', pg.body_md, 'sections', pg.sections,
      'document_version', pg.document_version,
      'medical_reviewed_at', pg.medical_reviewed_at,
      'updated_at', pg.updated_at,
      'seo', jsonb_build_object('title', pg.seo_title, 'description', pg.seo_description, 'og', private.media_json(pg.og_media_id)),
      'is_demo', pg.is_demo
    );
  elsif p_type = 'post' then
    select * into po from public.posts where id = p_id;
    return jsonb_build_object(
      'slug', po.slug, 'title', po.title, 'excerpt', po.excerpt, 'body_md', po.body_md,
      'cover', private.media_json(po.cover_media_id),
      'author', coalesce(private.doctor_public_ref(po.author_doctor_id), jsonb_build_object('name', po.author_name)),
      'reviewer', private.doctor_public_ref(po.reviewer_doctor_id),
      'medical_reviewed_at', po.medical_reviewed_at,
      'references', po.references_list,
      'related_service_ids', to_jsonb(po.related_service_ids),
      'seo', jsonb_build_object('title', po.seo_title, 'description', po.seo_description, 'og', private.media_json(po.og_media_id)),
      'is_demo', po.is_demo
    );
  elsif p_type = 'faq' then
    select * into f from public.faqs where id = p_id;
    return jsonb_build_object('question', f.question, 'answer_md', f.answer_md, 'category', f.category,
      'is_demo', f.is_demo);
  end if;
  raise exception 'unknown_entity_type' using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------
-- Transiciones editoriales: submit | publish | unpublish | archive | restore_draft
-- ---------------------------------------------------------------------------
create or replace function public.cms_transition(p_entity_type text, p_entity_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_status public.content_status;
  v_requires_review boolean;
  v_slug text;
  v_path text;
  v_old_path text;
  v_sort integer := 100;
  v_is_demo boolean;
  v_snapshot jsonb;
  v_table text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not private.has_any_role(array['admin', 'editor', 'professional']::public.staff_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_table := case p_entity_type
    when 'service' then 'services' when 'doctor' then 'doctors' when 'page' then 'pages'
    when 'post' then 'posts' when 'faq' then 'faqs' end;
  if v_table is null then
    raise exception 'unknown_entity_type' using errcode = '22023';
  end if;

  execute format('select to_jsonb(t) from public.%I t where id = $1 for update', v_table) into v_row using p_entity_id;
  if v_row is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_status := (v_row ->> 'status')::public.content_status;
  v_is_demo := coalesce((v_row ->> 'is_demo')::boolean, false);
  v_requires_review := p_entity_type in ('service', 'post')
    or (p_entity_type = 'page' and coalesce((v_row ->> 'requires_medical_review')::boolean, false));

  if p_action = 'submit' then
    if not private.has_any_role(array['admin', 'editor']::public.staff_role[]) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if v_status <> 'draft' then
      raise exception 'invalid_transition' using errcode = '22023';
    end if;
    execute format('update public.%I set status = ''medical_review'', submitted_by = $1, submitted_at = now() where id = $2', v_table)
      using v_uid, p_entity_id;

  elsif p_action = 'publish' then
    if v_requires_review then
      if v_status <> 'medical_review' then
        raise exception 'medical_review_required: envía a revisión médica antes de publicar' using errcode = '22023';
      end if;
      if not exists (select 1 from public.staff_profiles p where p.user_id = v_uid and p.active and p.can_review_medical) then
        raise exception 'forbidden: se requiere un revisor médico habilitado' using errcode = '42501';
      end if;
      if p_entity_type = 'post' then
        if private.doctor_public_ref((v_row ->> 'reviewer_doctor_id')::uuid) is null then
          raise exception 'reviewer_required: el revisor debe ser un profesional con perfil publicado' using errcode = '22023';
        end if;
        if (v_row ->> 'author_doctor_id') is not null
           and private.doctor_public_ref((v_row ->> 'author_doctor_id')::uuid) is null then
          raise exception 'author_unpublished: el perfil del autor no está publicado' using errcode = '22023';
        end if;
      end if;
      execute format('update public.%I set status = ''published'', medical_reviewed_by = $1, medical_reviewed_at = now() where id = $2', v_table)
        using v_uid, p_entity_id;
    else
      if p_entity_type = 'doctor' then
        if not private.is_staff_mfa(array['admin']::public.staff_role[]) then
          raise exception 'forbidden: sólo administración publica perfiles profesionales' using errcode = '42501';
        end if;
        if not coalesce((v_row ->> 'credentials_verified')::boolean, false) then
          raise exception 'credentials_unverified: verifica CMP/RNE antes de publicar' using errcode = '22023';
        end if;
      elsif not private.has_any_role(array['admin', 'editor']::public.staff_role[]) then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_status not in ('draft', 'medical_review', 'published') then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      execute format('update public.%I set status = ''published'' where id = $1', v_table) using p_entity_id;
    end if;

    v_snapshot := private.build_snapshot(p_entity_type, p_entity_id);
    v_slug := v_row ->> 'slug';
    v_path := case p_entity_type
      when 'service' then '/servicios/' || v_slug
      when 'doctor' then '/equipo/' || v_slug
      when 'post' then '/blog/' || v_slug
      when 'page' then private.page_path(v_row ->> 'kind')
      else null end;
    if v_row ? 'sort_order' then
      v_sort := (v_row ->> 'sort_order')::integer;
    end if;

    select pc.path into v_old_path from public.published_content pc
      where pc.entity_type = p_entity_type and pc.entity_id = p_entity_id;

    -- La nueva ruta deja de ser origen de redirecciones (evita bucles al volver a un slug anterior).
    if v_path is not null then
      delete from public.redirects where from_path = v_path;
    end if;

    insert into public.published_content as pc (entity_type, entity_id, path, slug, data, sort_order, is_demo)
    values (p_entity_type, p_entity_id, v_path, v_slug, v_snapshot, v_sort, v_is_demo)
    on conflict (entity_type, entity_id) do update
      set path = excluded.path, slug = excluded.slug, data = excluded.data,
          sort_order = excluded.sort_order, is_demo = excluded.is_demo, updated_at = now();

    -- Cambio de slug publicado → 301 automática y aplanado de cadenas existentes.
    if v_old_path is not null and v_path is not null and v_old_path <> v_path then
      update public.redirects set to_path = v_path where to_path = v_old_path;
      insert into public.redirects (from_path, to_path, source, created_by)
      values (v_old_path, v_path, 'auto', v_uid)
      on conflict (from_path) do update set to_path = excluded.to_path;
    end if;

    insert into public.content_revisions (entity_type, entity_id, reason, snapshot, created_by)
    values (p_entity_type, p_entity_id, 'publish', v_snapshot, v_uid);

  elsif p_action in ('unpublish', 'archive') then
    if p_entity_type = 'doctor' and not private.is_staff_mfa(array['admin']::public.staff_role[]) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if not private.has_any_role(array['admin', 'editor']::public.staff_role[]) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    delete from public.published_content where entity_type = p_entity_type and entity_id = p_entity_id;
    execute format('update public.%I set status = $1 where id = $2', v_table)
      using (case p_action when 'archive' then 'archived' else 'draft' end)::public.content_status, p_entity_id;

  elsif p_action = 'restore_draft' then
    if not private.has_any_role(array['admin', 'editor']::public.staff_role[]) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if v_status <> 'archived' then
      raise exception 'invalid_transition' using errcode = '22023';
    end if;
    execute format('update public.%I set status = ''draft'' where id = $1', v_table) using p_entity_id;
  else
    raise exception 'unknown_action' using errcode = '22023';
  end if;

  perform private.audit('cms.' || p_action, p_entity_type, p_entity_id::text);
  execute format('select status::text from public.%I where id = $1', v_table) into v_slug using p_entity_id;
  return jsonb_build_object('ok', true, 'status', v_slug, 'path', v_path);
end;
$$;

-- Restaura el contenido de una revisión en la copia de trabajo (queda como borrador).
create or replace function public.cms_restore_revision(p_revision_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.content_revisions;
  v_table text;
  v_keep text[] := array['id', 'slug', 'status', 'submitted_by', 'submitted_at', 'medical_reviewed_by',
    'medical_reviewed_at', 'created_at', 'updated_at', 'is_demo', 'kind', 'active', 'online_booking_enabled',
    'credentials_verified', 'credentials_verified_at', 'credentials_verified_by'];
  v_cols text;
begin
  if not private.has_any_role(array['admin', 'editor']::public.staff_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into r from public.content_revisions where id = p_revision_id;
  if not found or r.reason <> 'update' then
    raise exception 'not_found: sólo se restauran revisiones de edición' using errcode = 'P0002';
  end if;
  v_table := case r.entity_type when 'service' then 'services' when 'doctor' then 'doctors'
    when 'page' then 'pages' when 'post' then 'posts' when 'faq' then 'faqs' end;

  select string_agg(format('%1$I = s.%1$I', a.attname), ', ')
    into v_cols
  from pg_attribute a
  where a.attrelid = ('public.' || v_table)::regclass and a.attnum > 0 and not a.attisdropped
    and not (a.attname = any (v_keep));

  execute format(
    'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) s where t.id = $2',
    v_table, v_cols
  ) using r.snapshot, r.entity_id;
  execute format('update public.%I set status = ''draft'' where id = $1 and status <> ''archived''', v_table) using r.entity_id;

  perform private.audit('cms.restore_revision', r.entity_type, r.entity_id::text, jsonb_build_object('revision', r.id));
  return jsonb_build_object('ok', true);
end;
$$;

-- Relación pública profesional ↔ servicio (sólo combinaciones activas y publicadas).
create or replace function public.public_offerings()
returns table (doctor_id uuid, service_id uuid, online_booking boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select ds.doctor_id, ds.service_id,
         (ds.online_booking and d.online_booking_enabled and s.online_booking_enabled) as online_booking
  from public.doctor_services ds
  join public.doctors d on d.id = ds.doctor_id and d.active
  join public.services s on s.id = ds.service_id and s.active
  where ds.active
    and exists (select 1 from public.published_content p where p.entity_type = 'doctor' and p.entity_id = d.id)
    and exists (select 1 from public.published_content p where p.entity_type = 'service' and p.entity_id = s.id);
$$;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.pages enable row level security;
alter table public.posts enable row level security;
alter table public.faqs enable row level security;
alter table public.published_content enable row level security;
alter table public.content_revisions enable row level security;
alter table public.redirects enable row level security;

-- Lectura pública: sólo snapshots publicados y redirecciones.
grant select on public.published_content to anon, authenticated;
create policy published_read on public.published_content for select to anon, authenticated using (true);
grant select on public.redirects to anon, authenticated;
create policy redirects_read on public.redirects for select to anon, authenticated using (true);
grant insert, update, delete on public.redirects to authenticated;
create policy redirects_write on public.redirects for all to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));

-- Copias de trabajo: personal editorial (y profesionales para revisar).
grant select, insert, delete on public.pages, public.posts, public.faqs to authenticated;
grant update (title, intro, body_md, sections, seo_title, seo_description, og_media_id, document_version)
  on public.pages to authenticated;
grant update (slug, title, excerpt, body_md, cover_media_id, author_doctor_id, author_name, reviewer_doctor_id,
  references_list, related_service_ids, seo_title, seo_description, og_media_id) on public.posts to authenticated;
grant update (question, answer_md, category, sort_order) on public.faqs to authenticated;

create policy pages_read on public.pages for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'professional']::public.staff_role[]));
create policy pages_insert on public.pages for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status = 'draft');
create policy pages_update on public.pages for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy pages_delete on public.pages for delete to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]) and status in ('draft', 'archived'));

create policy posts_read on public.posts for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'professional']::public.staff_role[]));
create policy posts_insert on public.posts for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status = 'draft');
create policy posts_update on public.posts for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy posts_delete on public.posts for delete to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status in ('draft', 'archived'));

create policy faqs_read on public.faqs for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'reception', 'professional']::public.staff_role[]));
create policy faqs_insert on public.faqs for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status = 'draft');
create policy faqs_update on public.faqs for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy faqs_delete on public.faqs for delete to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status in ('draft', 'archived'));

grant select on public.content_revisions to authenticated;
create policy revisions_read on public.content_revisions for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'professional']::public.staff_role[]));

revoke all on function public.cms_transition(text, uuid, text) from public, anon;
revoke all on function public.cms_restore_revision(bigint) from public, anon;
revoke all on function public.public_offerings() from public;
grant execute on function public.cms_transition(text, uuid, text) to authenticated;
grant execute on function public.cms_restore_revision(bigint) to authenticated;
grant execute on function public.public_offerings() to anon, authenticated, service_role;
