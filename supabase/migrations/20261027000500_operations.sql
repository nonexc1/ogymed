-- OGYMED · 0005 · Operación: contacto, reclamaciones, derechos de privacidad, personal, reportes y Storage.

-- ---------------------------------------------------------------------------
-- Solicitudes de contacto (formulario breve). Se advierte no incluir información médica.
-- ---------------------------------------------------------------------------
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  topic text not null check (topic in ('cita', 'informacion', 'otro')),
  message text not null default '' check (char_length(message) <= 1000),
  privacy_version text not null check (char_length(privacy_version) <= 40),
  status text not null default 'new' check (status in ('new', 'in_progress', 'handled', 'spam')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  check (email is not null or phone_e164 is not null)
);
create index contact_requests_created_idx on public.contact_requests (created_at desc);

-- ---------------------------------------------------------------------------
-- Libro de reclamaciones (registro privado). Campos y plazos: PENDIENTES DE VALIDACIÓN LEGAL.
-- ---------------------------------------------------------------------------
create sequence public.complaint_seq;
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('reclamo', 'queja')),
  consumer_name text not null check (char_length(consumer_name) between 2 and 160),
  document_type text not null check (document_type in ('DNI', 'CE', 'PASAPORTE', 'OTRO')),
  document_number text not null check (char_length(document_number) between 4 and 20),
  address text check (char_length(address) <= 250),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_minor boolean not null default false,
  guardian_name text check (char_length(guardian_name) <= 160),
  service_description text not null check (char_length(service_description) between 2 and 500),
  amount_pen numeric(10, 2) check (amount_pen >= 0),
  detail text not null check (char_length(detail) between 10 and 3000),
  consumer_request text not null check (char_length(consumer_request) between 2 and 1500),
  privacy_version text not null,
  status text not null default 'received' check (status in ('received', 'in_progress', 'answered', 'closed')),
  response_text text check (char_length(response_text) <= 4000),
  responded_at timestamptz,
  responded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (not is_minor or guardian_name is not null)
);

-- ---------------------------------------------------------------------------
-- Solicitudes de derechos sobre datos personales (acceso, rectificación, cancelación, oposición…)
-- ---------------------------------------------------------------------------
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('acceso', 'rectificacion', 'cancelacion', 'oposicion', 'revocacion', 'otro')),
  requester_name text not null check (char_length(requester_name) between 2 and 160),
  email text not null check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  detail text not null default '' check (char_length(detail) <= 2000),
  status text not null default 'received' check (status in ('received', 'identity_check', 'in_progress', 'resolved', 'rejected')),
  resolution_note text check (char_length(resolution_note) <= 2000),
  handled_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ingreso público (EXECUTE sólo service_role; el servidor valida, limita y aplica honeypot)
-- ---------------------------------------------------------------------------
create or replace function public.contact_request_create(
  p_full_name text, p_email text, p_phone text, p_topic text, p_message text, p_privacy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.contact_requests (full_name, email, phone_e164, topic, message, privacy_version)
  values (p_full_name, nullif(lower(trim(p_email)), ''), nullif(trim(p_phone), ''), p_topic,
          coalesce(p_message, ''), p_privacy_version)
  returning id into v_id;
  perform private.enqueue('staff_contact_request', 'reception', null, null, null,
    format('staff_contact_request:%s', v_id), now(), v_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.complaint_create(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_id uuid;
begin
  if not (select complaints_book_enabled from public.clinic_settings_public where id) then
    return jsonb_build_object('ok', false, 'code', 'disabled');
  end if;
  v_code := format('LR-%s-%s', to_char(now() at time zone 'America/Lima', 'YYYY'),
                   lpad(nextval('public.complaint_seq')::text, 6, '0'));
  insert into public.complaints (code, kind, consumer_name, document_type, document_number, address, phone_e164,
    email, is_minor, guardian_name, service_description, amount_pen, detail, consumer_request, privacy_version)
  values (v_code, p ->> 'kind', p ->> 'consumer_name', p ->> 'document_type', p ->> 'document_number',
    nullif(p ->> 'address', ''), nullif(p ->> 'phone_e164', ''), nullif(lower(p ->> 'email'), ''),
    coalesce((p ->> 'is_minor')::boolean, false), nullif(p ->> 'guardian_name', ''), p ->> 'service_description',
    nullif(p ->> 'amount_pen', '')::numeric, p ->> 'detail', p ->> 'consumer_request', p ->> 'privacy_version')
  returning id into v_id;
  perform private.enqueue('staff_complaint', 'reception', null, null, null, format('staff_complaint:%s', v_id), now(), v_id);
  perform private.audit('complaint.create', 'complaint', v_id::text, jsonb_build_object('code', v_code), 'patient');
  return jsonb_build_object('ok', true, 'code', v_code, 'created_at', now());
end;
$$;

create or replace function public.privacy_request_create(p_kind text, p_name text, p_email text, p_detail text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.privacy_requests (kind, requester_name, email, detail)
  values (p_kind, p_name, lower(trim(p_email)), coalesce(p_detail, ''))
  returning id into v_id;
  perform private.audit('privacy_request.create', 'privacy_request', v_id::text, '{}'::jsonb, 'patient');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Personal: identidad, alta/roles (admin + MFA), bootstrap del primer admin
-- ---------------------------------------------------------------------------
create or replace function public.staff_whoami()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.user_id is null then null else jsonb_build_object(
    'user_id', p.user_id, 'display_name', p.display_name, 'active', p.active,
    'doctor_id', p.doctor_id, 'can_review_medical', p.can_review_medical,
    'roles', coalesce((select jsonb_agg(r.role) from public.staff_roles r where r.user_id = p.user_id), '[]'::jsonb),
    'aal', (select auth.jwt()) ->> 'aal'
  ) end
  from (select (select auth.uid()) as uid) me
  left join public.staff_profiles p on p.user_id = me.uid;
$$;

create or replace function public.admin_list_staff()
returns table (
  user_id uuid, email text, display_name text, active boolean, roles public.staff_role[],
  doctor_id uuid, can_review_medical boolean, last_sign_in_at timestamptz, mfa_factors integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin']::public.staff_role[]);
  return query
  select p.user_id, u.email::text, p.display_name, p.active,
    coalesce((select array_agg(r.role order by r.role) from public.staff_roles r where r.user_id = p.user_id), '{}'),
    p.doctor_id, p.can_review_medical, u.last_sign_in_at,
    (select count(*)::integer from auth.mfa_factors f where f.user_id = p.user_id and f.status = 'verified')
  from public.staff_profiles p
  join auth.users u on u.id = p.user_id
  order by p.display_name;
end;
$$;

create or replace function public.admin_upsert_staff(
  p_user_id uuid, p_display_name text, p_roles public.staff_role[], p_doctor_id uuid,
  p_can_review_medical boolean, p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin']::public.staff_role[]);
  v_admins integer;
begin
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    return jsonb_build_object('ok', false, 'code', 'user_not_found');
  end if;
  if 'professional' = any (p_roles) and p_doctor_id is null then
    return jsonb_build_object('ok', false, 'code', 'doctor_required');
  end if;

  insert into public.staff_profiles (user_id, display_name, doctor_id, can_review_medical, active)
  values (p_user_id, p_display_name, p_doctor_id, coalesce(p_can_review_medical, false), coalesce(p_active, true))
  on conflict (user_id) do update set display_name = excluded.display_name, doctor_id = excluded.doctor_id,
    can_review_medical = excluded.can_review_medical, active = excluded.active;

  delete from public.staff_roles where user_id = p_user_id and not (role = any (p_roles));
  insert into public.staff_roles (user_id, role, granted_by)
  select p_user_id, r, v_uid from unnest(p_roles) r
  on conflict (user_id, role) do nothing;

  -- Nunca dejar la clínica sin administradores activos.
  select count(*) into v_admins from public.staff_roles r join public.staff_profiles p on p.user_id = r.user_id
  where r.role = 'admin' and p.active;
  if v_admins = 0 then
    raise exception 'last_admin: debe quedar al menos un administrador activo' using errcode = '23514';
  end if;

  perform private.audit('staff.upsert', 'staff', p_user_id::text,
    jsonb_build_object('roles', p_roles, 'active', p_active, 'can_review_medical', p_can_review_medical));
  return jsonb_build_object('ok', true);
end;
$$;

-- Registro auditado del restablecimiento de MFA (los factores se eliminan con la Admin API de Auth).
create or replace function public.admin_record_mfa_reset(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin']::public.staff_role[]);
  perform private.audit('staff.mfa_reset', 'staff', p_user_id::text);
end;
$$;

-- Sólo funciona mientras no exista ningún administrador (alta inicial documentada en ADMIN_GUIDE).
create or replace function public.bootstrap_first_admin(p_user_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.staff_roles where role = 'admin') then
    return jsonb_build_object('ok', false, 'code', 'admin_exists');
  end if;
  insert into public.staff_profiles (user_id, display_name) values (p_user_id, p_display_name)
  on conflict (user_id) do update set display_name = excluded.display_name, active = true;
  insert into public.staff_roles (user_id, role) values (p_user_id, 'admin') on conflict do nothing;
  perform private.audit('staff.bootstrap_admin', 'staff', p_user_id::text, '{}'::jsonb, 'system');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gestión restringida: reclamaciones, privacidad, contacto, anonimización
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_complaint(p_id uuid, p_status text, p_response text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin']::public.staff_role[]);
begin
  update public.complaints set status = p_status,
    response_text = coalesce(nullif(trim(p_response), ''), response_text),
    responded_at = case when p_status = 'answered' and responded_at is null then now() else responded_at end,
    responded_by = case when p_status = 'answered' then v_uid else responded_by end
  where id = p_id;
  perform private.audit('complaint.update', 'complaint', p_id::text, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', found);
end;
$$;

create or replace function public.admin_update_privacy_request(p_id uuid, p_status text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin']::public.staff_role[]);
begin
  update public.privacy_requests set status = p_status,
    resolution_note = coalesce(nullif(trim(p_note), ''), resolution_note), handled_by = v_uid,
    resolved_at = case when p_status in ('resolved', 'rejected') then now() else resolved_at end
  where id = p_id;
  perform private.audit('privacy_request.update', 'privacy_request', p_id::text, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', found);
end;
$$;

create or replace function public.staff_update_contact_request(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin', 'reception']::public.staff_role[]);
begin
  update public.contact_requests set status = p_status, handled_by = v_uid,
    handled_at = case when p_status in ('handled', 'spam') then now() else handled_at end
  where id = p_id;
  perform private.audit('contact_request.update', 'contact_request', p_id::text, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', found);
end;
$$;

-- Anonimiza un contacto sin citas futuras activas (derecho de cancelación/supresión).
create or replace function public.admin_anonymize_contact(p_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin']::public.staff_role[]);
  if exists (select 1 from public.appointments a where a.contact_id = p_contact_id
             and a.status in ('pending_confirmation', 'confirmed') and a.starts_at > now()) then
    return jsonb_build_object('ok', false, 'code', 'has_future_appointments');
  end if;
  update public.contacts set full_name = 'Contacto anonimizado', email = null, phone_e164 = null,
    email_verified_at = null, anonymized_at = now()
  where id = p_contact_id and anonymized_at is null;
  update public.notification_outbox set status = 'cancelled', last_error = 'contact_anonymized'
  where contact_id = p_contact_id and status in ('pending', 'failed');
  perform private.audit('contact.anonymize', 'contact', p_contact_id::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- Lectura de una ficha de contacto con auditoría de acceso sensible.
create or replace function public.staff_contact_detail(p_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contacts;
begin
  perform private.require_staff(array['admin', 'reception', 'professional']::public.staff_role[]);
  select * into c from public.contacts where id = p_contact_id;
  if c.id is null then
    return null;
  end if;
  if not private.can_read_all_appointments() and not exists (
    select 1 from public.appointments a where a.contact_id = c.id and a.doctor_id = private.current_doctor_id()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.audit('contact.view', 'contact', c.id::text, '{}'::jsonb);
  return jsonb_build_object('id', c.id, 'full_name', c.full_name, 'email', c.email,
    'email_verified', c.email_verified_at is not null, 'phone_e164', c.phone_e164,
    'anonymized', c.anonymized_at is not null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reportes agregados (sin datos de contacto) y exportación minimizada auditada
-- ---------------------------------------------------------------------------
create or replace function public.report_appointments_summary(p_from date, p_to date)
returns table (month date, status public.appointment_status, origin public.appointment_origin,
  service_id uuid, doctor_id uuid, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin', 'reception']::public.staff_role[]);
  return query
  select date_trunc('month', a.starts_at at time zone 'America/Lima')::date, a.status, a.origin,
         a.service_id, a.doctor_id, count(*)
  from public.appointments a
  where a.status <> 'hold'
    and (a.starts_at at time zone 'America/Lima')::date between p_from and p_to
  group by 1, 2, 3, 4, 5
  order by 1, 2;
end;
$$;

create or replace function public.report_export_appointments(p_from date, p_to date)
returns table (starts_at timestamptz, doctor_id uuid, service_id uuid, status public.appointment_status,
  origin public.appointment_origin)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin']::public.staff_role[]);
  if p_to - p_from > 366 then
    raise exception 'range_too_large' using errcode = '22023';
  end if;
  perform private.audit('report.export', 'appointments', null,
    jsonb_build_object('from', p_from, 'to', p_to));
  return query
  select a.starts_at, a.doctor_id, a.service_id, a.status, a.origin
  from public.appointments a
  where a.status <> 'hold' and (a.starts_at at time zone 'America/Lima')::date between p_from and p_to
  order by a.starts_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.contact_requests enable row level security;
alter table public.complaints enable row level security;
alter table public.privacy_requests enable row level security;

grant select on public.contact_requests to authenticated;
create policy contact_requests_read on public.contact_requests for select to authenticated
  using (private.can_read_all_appointments());

grant select on public.complaints, public.privacy_requests to authenticated;
create policy complaints_read on public.complaints for select to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]));
create policy privacy_requests_read on public.privacy_requests for select to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]));

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.contact_request_create(text, text, text, text, text, text)',
    'public.complaint_create(jsonb)',
    'public.privacy_request_create(text, text, text, text)',
    'public.bootstrap_first_admin(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;

  foreach f in array array[
    'public.staff_whoami()',
    'public.admin_list_staff()',
    'public.admin_upsert_staff(uuid, text, public.staff_role[], uuid, boolean, boolean)',
    'public.admin_record_mfa_reset(uuid)',
    'public.admin_update_complaint(uuid, text, text)',
    'public.admin_update_privacy_request(uuid, text, text)',
    'public.staff_update_contact_request(uuid, text)',
    'public.admin_anonymize_contact(uuid)',
    'public.staff_contact_detail(uuid)',
    'public.report_appointments_summary(date, date)',
    'public.report_export_appointments(date, date)'
  ] loop
    execute format('revoke all on function %s from public, anon, service_role', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke all on sequence public.complaint_seq from anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: imágenes públicas (fotografías autorizadas). Documentos privados: no se usan en v1.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-media', 'public-media', true, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do nothing;

create policy public_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy public_media_update on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and private.has_any_role(array['admin', 'editor']::public.staff_role[]))
  with check (bucket_id = 'public-media' and private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy public_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and private.has_any_role(array['admin', 'editor']::public.staff_role[]));
create policy public_media_select_staff on storage.objects for select to authenticated
  using (bucket_id = 'public-media' and private.has_any_role(array['admin', 'editor']::public.staff_role[]));

-- ---------------------------------------------------------------------------
-- Barrido final de privilegios: nada de escritura directa para anon; service_role sólo vía RPC.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t.relname);
    execute format('revoke all on public.%I from service_role', t.relname);
  end loop;
end;
$$;
