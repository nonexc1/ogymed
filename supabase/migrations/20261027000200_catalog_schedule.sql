-- OGYMED · 0002 · Configuración, catálogo (profesionales/servicios), horarios, recursos, medios y contactos.
-- Ningún dato real de la clínica se inserta aquí: los valores reales se cargan desde el panel.

-- ---------------------------------------------------------------------------
-- Configuración pública (NAP, horarios, redes, IDs de integraciones NO secretos)
-- ---------------------------------------------------------------------------
create table public.clinic_settings_public (
  id boolean primary key default true check (id),
  clinic_name text not null default 'OGYMED' check (char_length(clinic_name) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 200),
  ruc text check (ruc ~ '^[0-9]{11}$'),
  address_line text check (char_length(address_line) <= 200),
  address_reference text check (char_length(address_reference) <= 200),
  district text not null default 'Santiago de Surco' check (char_length(district) <= 80),
  city text not null default 'Lima' check (char_length(city) <= 80),
  region text not null default 'Lima' check (char_length(region) <= 80),
  postal_code text check (postal_code ~ '^[0-9]{5}$'),
  country_code text not null default 'PE' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  public_email text check (public_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- [{ "days": [1,2,3,4,5], "opens": "09:00", "closes": "18:00" }] (ISO: 1 = lunes)
  opening_hours jsonb not null default '[]'::jsonb check (jsonb_typeof(opening_hours) = 'array'),
  opening_hours_note text check (char_length(opening_hours_note) <= 300),
  -- { "instagram": "https://…", … } sólo perfiles verificados por la clínica
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  google_maps_url text check (google_maps_url ~ '^https://'),
  ga4_measurement_id text check (ga4_measurement_id ~ '^G-[A-Z0-9]{4,16}$'),
  gsc_verification_token text check (gsc_verification_token ~ '^[A-Za-z0-9_-]{10,100}$'),
  booking_mode public.booking_mode not null default 'off',
  complaints_book_enabled boolean not null default false,
  privacy_policy_version text check (char_length(privacy_policy_version) <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.clinic_settings_public (id) values (true);
create trigger clinic_settings_public_touch before update on public.clinic_settings_public
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Configuración operativa privada (parámetros de agenda). Sin secretos: éstos van en variables de entorno.
-- ---------------------------------------------------------------------------
create table public.clinic_settings_private (
  id boolean primary key default true check (id),
  hold_minutes integer not null default 5 check (hold_minutes between 2 and 30),
  min_notice_minutes integer not null default 120 check (min_notice_minutes between 0 and 10080),
  max_horizon_days integer not null default 60 check (max_horizon_days between 1 and 365),
  pending_expiry_hours integer not null default 24 check (pending_expiry_hours between 1 and 168),
  cancellation_window_hours integer not null default 24 check (cancellation_window_hours between 0 and 336),
  reminder_hours_before integer not null default 24 check (reminder_hours_before between 1 and 168),
  reception_notification_email text check (reception_notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  verification_code_ttl_minutes integer not null default 10 check (verification_code_ttl_minutes between 3 and 30),
  verification_max_attempts integer not null default 5 check (verification_max_attempts between 3 and 10),
  access_link_ttl_hours integer not null default 72 check (access_link_ttl_hours between 1 and 336),
  manage_session_minutes integer not null default 30 check (manage_session_minutes between 5 and 120),
  booking_session_hours integer not null default 6 check (booking_session_hours between 1 and 48),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.clinic_settings_private (id) values (true);
create trigger clinic_settings_private_touch before update on public.clinic_settings_private
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Medios (Supabase Storage). Derechos de uso confirmados antes de publicar.
-- ---------------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-media' check (bucket in ('public-media')),
  path text not null unique check (char_length(path) <= 300),
  mime_type text not null check (mime_type in ('image/webp', 'image/jpeg', 'image/png', 'image/avif')),
  width integer check (width > 0),
  height integer check (height > 0),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  caption text check (char_length(caption) <= 300),
  rights_confirmed boolean not null default false,
  rights_holder text check (char_length(rights_holder) <= 200),
  rights_note text check (char_length(rights_note) <= 500),
  is_demo boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger media_assets_touch before update on public.media_assets
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Profesionales: copia de trabajo del perfil + campos operativos de agenda.
-- La versión pública se materializa en published_content al publicar (0004).
-- ---------------------------------------------------------------------------
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  honorific text check (honorific in ('Dra.', 'Dr.', 'Obst.', 'Lic.')),
  full_name text not null check (char_length(full_name) between 3 and 120),
  specialty text check (char_length(specialty) <= 120),
  cmp_number text check (cmp_number ~ '^[0-9]{3,7}$'),
  rne_number text check (rne_number ~ '^[0-9]{3,7}$'),
  credentials_verified boolean not null default false,
  credentials_verified_at timestamptz,
  credentials_verified_by uuid references auth.users (id) on delete set null,
  bio_md text not null default '' check (char_length(bio_md) <= 8000),
  background_md text not null default '' check (char_length(background_md) <= 8000),
  photo_media_id uuid references public.media_assets (id) on delete set null,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  og_media_id uuid references public.media_assets (id) on delete set null,
  sort_order integer not null default 100,
  -- Operativos (sólo administración)
  active boolean not null default true,
  online_booking_enabled boolean not null default true,
  -- Flujo editorial
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger doctors_touch before update on public.doctors
  for each row execute function private.touch_updated_at();

alter table public.staff_profiles
  add constraint staff_profiles_doctor_fk foreign key (doctor_id) references public.doctors (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Servicios: copia de trabajo del contenido + campos operativos.
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 3 and 120),
  category text check (char_length(category) <= 80),
  summary text not null default '' check (char_length(summary) <= 400),
  body_md text not null default '' check (char_length(body_md) <= 20000),
  audience_md text not null default '' check (char_length(audience_md) <= 6000),
  what_to_expect_md text not null default '' check (char_length(what_to_expect_md) <= 8000),
  preparation_md text not null default '' check (char_length(preparation_md) <= 6000),
  -- [{ "q": "...", "a": "..." }]
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  price_pen numeric(10, 2) check (price_pen >= 0),
  price_approved boolean not null default false,
  show_duration boolean not null default false,
  hero_media_id uuid references public.media_assets (id) on delete set null,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  og_media_id uuid references public.media_assets (id) on delete set null,
  sort_order integer not null default 100,
  -- Operativos
  active boolean not null default true,
  online_booking_enabled boolean not null default true,
  -- Flujo editorial (requiere revisión médica)
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  medical_reviewed_by uuid references auth.users (id) on delete set null,
  medical_reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_touch before update on public.services
  for each row execute function private.touch_updated_at();

-- Duración y buffers por combinación profesional-servicio.
create table public.doctor_services (
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes between 0 and 120),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 120),
  online_booking boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (doctor_id, service_id)
);
create index doctor_services_service_idx on public.doctor_services (service_id);
create trigger doctor_services_touch before update on public.doctor_services
  for each row execute function private.touch_updated_at();

-- Horario semanal recurrente. Los descansos se modelan como bloques separados
-- (p. ej. 09:00–13:00 y 15:00–19:00). Las horas se interpretan en `timezone`.
create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- ISO 8601: 1 = lunes
  start_time time not null,
  end_time time not null,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  valid_from date not null default current_date,
  valid_until date,
  timezone text not null default 'America/Lima' check (timezone = 'America/Lima'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_until >= valid_from)
);
create index schedule_rules_doctor_idx on public.schedule_rules (doctor_id, weekday) where active;
create trigger schedule_rules_touch before update on public.schedule_rules
  for each row execute function private.touch_updated_at();

-- Excepciones: feriados (toda la sede si doctor_id es null), ausencias y bloqueos.
create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctors (id) on delete cascade,
  kind text not null check (kind in ('holiday', 'absence', 'block')),
  period tstzrange not null check (not isempty(period) and lower_inc(period) and not upper_inc(period)),
  -- Nota interna operativa: no registrar información clínica.
  note text check (char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index schedule_exceptions_period_idx on public.schedule_exceptions using gist (period);
create index schedule_exceptions_doctor_idx on public.schedule_exceptions (doctor_id);

-- Recursos compartidos opcionales (consultorio, equipo). Si un servicio requiere un
-- recurso, la cita también lo reserva con el mismo mecanismo de exclusión (0003).
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  kind text not null default 'room' check (kind in ('room', 'equipment')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_resources (
  service_id uuid not null references public.services (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  primary key (service_id, resource_id)
);

-- ---------------------------------------------------------------------------
-- Contactos mínimos (sin DNI, fecha de nacimiento ni datos clínicos).
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  email_verified_at timestamptz,
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  created_by uuid references auth.users (id) on delete set null,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone_e164 is not null or anonymized_at is not null)
);
-- Un contacto por email verificado (reutilizado entre reservas).
create unique index contacts_verified_email_uniq on public.contacts (email) where email_verified_at is not null;
create index contacts_phone_idx on public.contacts (phone_e164);
create trigger contacts_touch before update on public.contacts
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Guardas de columnas: los editores pueden tocar contenido, no campos operativos.
-- ---------------------------------------------------------------------------
create or replace function private.guard_catalog_operational_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Escrituras internas (SECURITY DEFINER / migraciones) no tienen auth.uid() o son de admin.
  if (select auth.uid()) is null or private.has_role('admin') then
    return new;
  end if;
  if new.active is distinct from old.active
     or new.online_booking_enabled is distinct from old.online_booking_enabled then
    raise exception 'forbidden: sólo administración puede cambiar campos operativos' using errcode = '42501';
  end if;
  if tg_table_name = 'doctors' then
    if new.credentials_verified is distinct from old.credentials_verified
       or new.credentials_verified_at is distinct from old.credentials_verified_at
       or new.credentials_verified_by is distinct from old.credentials_verified_by then
      raise exception 'forbidden: sólo administración puede verificar credenciales' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger doctors_guard before update on public.doctors
  for each row execute function private.guard_catalog_operational_columns();
create trigger services_guard before update on public.services
  for each row execute function private.guard_catalog_operational_columns();

-- Al cambiar CMP/RNE se pierde la verificación de credenciales.
create or replace function private.doctors_reset_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cmp_number is distinct from old.cmp_number or new.rne_number is distinct from old.rne_number then
    new.credentials_verified := false;
    new.credentials_verified_at := null;
    new.credentials_verified_by := null;
  end if;
  if new.credentials_verified and not old.credentials_verified then
    new.credentials_verified_at := now();
    new.credentials_verified_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger doctors_reset_verification before update on public.doctors
  for each row execute function private.doctors_reset_verification();

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.clinic_settings_public enable row level security;
alter table public.clinic_settings_private enable row level security;
alter table public.media_assets enable row level security;
alter table public.doctors enable row level security;
alter table public.services enable row level security;
alter table public.doctor_services enable row level security;
alter table public.schedule_rules enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.resources enable row level security;
alter table public.service_resources enable row level security;
alter table public.contacts enable row level security;

-- Configuración pública: lectura anónima; edición admin (validada en servidor y por CHECKs).
grant select on public.clinic_settings_public to anon, authenticated;
grant update (
  clinic_name, legal_name, ruc, address_line, address_reference, district, city, region, postal_code,
  latitude, longitude, phone_e164, whatsapp_e164, public_email, opening_hours, opening_hours_note,
  social_links, google_maps_url, ga4_measurement_id, gsc_verification_token, booking_mode,
  complaints_book_enabled, privacy_policy_version, updated_by
) on public.clinic_settings_public to authenticated;
create policy settings_public_read on public.clinic_settings_public for select to anon, authenticated using (true);
create policy settings_public_update on public.clinic_settings_public for update to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));

grant select on public.clinic_settings_private to authenticated;
grant update (
  hold_minutes, min_notice_minutes, max_horizon_days, pending_expiry_hours, cancellation_window_hours,
  reminder_hours_before, reception_notification_email, verification_code_ttl_minutes,
  verification_max_attempts, access_link_ttl_hours, manage_session_minutes, booking_session_hours, updated_by
) on public.clinic_settings_private to authenticated;
create policy settings_private_read on public.clinic_settings_private for select to authenticated
  using (private.is_staff_mfa(array['admin', 'reception']::public.staff_role[]));
create policy settings_private_update on public.clinic_settings_private for update to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));

-- Medios: personal editorial/admin.
grant select, insert, delete on public.media_assets to authenticated;
grant update (alt_text, caption, rights_confirmed, rights_holder, rights_note) on public.media_assets to authenticated;
create policy media_read on public.media_assets for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'reception', 'professional']::public.staff_role[]));
create policy media_write on public.media_assets for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and uploaded_by = (select auth.uid()));
create policy media_update on public.media_assets for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy media_delete on public.media_assets for delete to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]));

-- Profesionales y servicios (copia de trabajo): lectura de todo el personal; escritura editor/admin.
grant select, insert, delete on public.doctors, public.services to authenticated;
grant update (
  slug, honorific, full_name, specialty, cmp_number, rne_number, credentials_verified, bio_md, background_md,
  photo_media_id, seo_title, seo_description, og_media_id, sort_order, active, online_booking_enabled
) on public.doctors to authenticated;
grant update (
  slug, name, category, summary, body_md, audience_md, what_to_expect_md, preparation_md, faqs, price_pen,
  price_approved, show_duration, hero_media_id, seo_title, seo_description, og_media_id, sort_order,
  active, online_booking_enabled
) on public.services to authenticated;

create policy doctors_read on public.doctors for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'reception', 'professional']::public.staff_role[]));
create policy doctors_insert on public.doctors for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status = 'draft');
create policy doctors_update on public.doctors for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy doctors_delete on public.doctors for delete to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]) and status in ('draft', 'archived'));

create policy services_read on public.services for select to authenticated
  using (private.has_any_role(array['admin', 'editor', 'reception', 'professional']::public.staff_role[]));
create policy services_insert on public.services for insert to authenticated
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]) and status = 'draft');
create policy services_update on public.services for update to authenticated
  using (private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy services_delete on public.services for delete to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]) and status in ('draft', 'archived'));

-- Configuración de agenda: lectura de personal de agenda; escritura admin.
grant select, insert, update, delete on public.doctor_services, public.schedule_rules, public.resources,
  public.service_resources to authenticated;
create policy doctor_services_read on public.doctor_services for select to authenticated
  using (private.has_any_role(array['admin', 'reception', 'professional', 'editor']::public.staff_role[]));
create policy doctor_services_write on public.doctor_services for all to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));
create policy schedule_rules_read on public.schedule_rules for select to authenticated
  using (private.has_any_role(array['admin', 'reception', 'professional']::public.staff_role[]));
create policy schedule_rules_write on public.schedule_rules for all to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));
create policy resources_read on public.resources for select to authenticated
  using (private.has_any_role(array['admin', 'reception', 'professional']::public.staff_role[]));
create policy resources_write on public.resources for all to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));
create policy service_resources_read on public.service_resources for select to authenticated
  using (private.has_any_role(array['admin', 'reception', 'professional']::public.staff_role[]));
create policy service_resources_write on public.service_resources for all to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]))
  with check (private.is_staff_mfa(array['admin']::public.staff_role[]));

-- Excepciones/bloqueos: admin y recepción (coordinación de disponibilidad).
grant select, insert, delete on public.schedule_exceptions to authenticated;
create policy schedule_exceptions_read on public.schedule_exceptions for select to authenticated
  using (private.is_staff_mfa(array['admin', 'reception']::public.staff_role[])
         or (private.is_staff_mfa(array['professional']::public.staff_role[])
             and (doctor_id is null or doctor_id = private.current_doctor_id())));
create policy schedule_exceptions_insert on public.schedule_exceptions for insert to authenticated
  with check (private.is_staff_mfa(array['admin', 'reception']::public.staff_role[]) and created_by = (select auth.uid()));
create policy schedule_exceptions_delete on public.schedule_exceptions for delete to authenticated
  using (private.is_staff_mfa(array['admin', 'reception']::public.staff_role[]));

-- Contactos: nunca anon. Admin/recepción con MFA; profesional sólo los de su agenda (política en 0003).
grant select on public.contacts to authenticated;
create policy contacts_read_desk on public.contacts for select to authenticated
  using (private.can_read_all_appointments());
