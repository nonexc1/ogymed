-- OGYMED · 0001 · Fundaciones: extensiones, esquemas, tipos, personal y helpers de autorización.
--
-- Principios (ver docs/ARCHITECTURE.md):
--   * Denegar por defecto: se revocan los privilegios por defecto que Supabase concede a
--     anon/authenticated/service_role en el esquema public y se conceden sólo los explícitos.
--   * Funciones privilegiadas: SECURITY DEFINER + search_path vacío + nombres calificados.
--   * Lo que no debe exponerse por la Data API vive en el esquema `private` (no expuesto).

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Denegar por defecto en objetos futuros del esquema public creados por postgres.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('admin', 'reception', 'professional', 'editor');

create type public.appointment_status as enum (
  'hold', 'pending_confirmation', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'
);

create type public.appointment_origin as enum ('web', 'phone', 'whatsapp', 'in_person', 'other');

create type public.content_status as enum ('draft', 'medical_review', 'published', 'archived');

create type public.booking_mode as enum ('off', 'reception', 'automatic');

-- ---------------------------------------------------------------------------
-- Utilidades genéricas
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Personal (staff). Las cuentas viven en auth.users; aquí sólo perfil y roles.
-- No existe registro público: altas por invitación (ver docs/ADMIN_GUIDE.md).
-- ---------------------------------------------------------------------------
create table public.staff_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  -- Vincula a un profesional de la agenda (rol professional) cuando corresponde.
  doctor_id uuid,
  -- Habilitado por un administrador para aprobar la revisión médica de contenidos.
  can_review_medical boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_profiles_touch before update on public.staff_profiles
  for each row execute function private.touch_updated_at();

create table public.staff_roles (
  user_id uuid not null references public.staff_profiles (user_id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- Helpers de autorización (evaluados con la identidad del JWT de la sesión).
-- SECURITY DEFINER para poder leer staff_roles sin depender de sus políticas.
-- ---------------------------------------------------------------------------
create or replace function private.current_roles()
returns public.staff_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(r.role), '{}'::public.staff_role[])
  from public.staff_roles r
  join public.staff_profiles p on p.user_id = r.user_id
  where r.user_id = (select auth.uid()) and p.active;
$$;

create or replace function private.has_role(p_role public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_role = any (private.current_roles());
$$;

create or replace function private.has_any_role(p_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_roles() && p_roles;
$$;

-- MFA: la sesión debe estar en nivel de garantía aal2 (TOTP verificado).
create or replace function private.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

create or replace function private.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.doctor_id from public.staff_profiles p
  where p.user_id = (select auth.uid()) and p.active;
$$;

-- Acceso a datos de agenda/pacientes: requiere rol y MFA.
create or replace function private.can_read_all_appointments()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_aal2() and private.has_any_role(array['admin', 'reception']::public.staff_role[]);
$$;

create or replace function private.is_staff_mfa(p_roles public.staff_role[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_aal2() and private.has_any_role(p_roles);
$$;

-- Lanza excepción si la sesión no tiene alguno de los roles requeridos con MFA.
create or replace function private.require_staff(p_roles public.staff_role[])
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not private.is_aal2() then
    raise exception 'mfa_required' using errcode = '28000';
  end if;
  if not private.has_any_role(p_roles) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

grant execute on function
  private.current_roles(),
  private.has_role(public.staff_role),
  private.has_any_role(public.staff_role[]),
  private.is_aal2(),
  private.current_doctor_id(),
  private.can_read_all_appointments(),
  private.is_staff_mfa(public.staff_role[]),
  private.require_staff(public.staff_role[])
to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría: sólo inserción. Sin datos sensibles completos (sólo IDs técnicos).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_user_id uuid,
  actor_kind text not null check (actor_kind in ('staff', 'patient', 'system')),
  action text not null check (char_length(action) <= 80),
  entity_type text check (char_length(entity_type) <= 40),
  entity_id text check (char_length(entity_id) <= 80),
  details jsonb not null default '{}'::jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log es de sólo inserción' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

create or replace function private.audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_details jsonb default '{}'::jsonb,
  p_actor_kind text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  insert into public.audit_log (actor_user_id, actor_kind, action, entity_type, entity_id, details)
  values (
    v_uid,
    coalesce(p_actor_kind, case when v_uid is null then 'system' else 'staff' end),
    p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS de personal
-- ---------------------------------------------------------------------------
alter table public.staff_profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_log enable row level security;

grant select on public.staff_profiles to authenticated;
grant update (display_name) on public.staff_profiles to authenticated;
grant select on public.staff_roles to authenticated;
grant select on public.audit_log to authenticated;

-- Cada persona ve su propio perfil; recepción/admin ven al personal (nombres para la agenda).
create policy staff_profiles_select on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff_mfa(array['admin', 'reception']::public.staff_role[]));

create policy staff_profiles_update_self on public.staff_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Roles: lectura propia o admin. Sin políticas de escritura: sólo vía RPC de administración.
create policy staff_roles_select on public.staff_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff_mfa(array['admin']::public.staff_role[]));

create policy audit_log_select on public.audit_log for select to authenticated
  using (private.is_staff_mfa(array['admin']::public.staff_role[]));
