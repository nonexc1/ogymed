-- OGYMED · 0004 · Agenda transaccional, retenciones, verificación, autogestión y outbox.
--
-- MECANISMO ÚNICO DE CAPACIDAD (ver docs/ARCHITECTURE.md §Agenda):
--   * Retenciones (hold) y citas son filas de la MISMA tabla `appointments`.
--   * `occupied` = [inicio − buffer_antes, fin + buffer_después) y `blocks_capacity` = estado ∈
--     {hold, pending_confirmation, confirmed}; ambos los fija un trigger (no el cliente).
--   * EXCLUDE USING gist (doctor_id =, occupied &&) WHERE (blocks_capacity) impide solapes de
--     intervalos (no sólo de horas de inicio) entre holds y citas, incluso con transacciones concurrentes.
--   * Recursos compartidos: `appointment_resource_claims` se deriva por trigger de la propia cita y
--     tiene su propia EXCLUDE con el mismo predicado → un único origen de verdad (la cita).
--   * El predicado de la restricción NO depende de now(): los holds vencidos se marcan 'expired'
--     por job y, además, dentro de la transacción que adquiere un intervalo que los solapa.

-- ---------------------------------------------------------------------------
-- Sesiones de reserva, tokens y límites (esquema private: no expuesto por la Data API)
-- ---------------------------------------------------------------------------
create table private.booking_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  pending_name text check (char_length(pending_name) <= 120),
  pending_email text check (char_length(pending_email) <= 254),
  pending_phone text check (pending_phone ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash text check (code_hash ~ '^[0-9a-f]{64}$'),
  code_expires_at timestamptz,
  code_attempts integer not null default 0,
  codes_sent integer not null default 0,
  contact_id uuid references public.contacts (id) on delete set null,
  verified_email text,
  verified_at timestamptz
);
create index booking_sessions_expires_idx on private.booking_sessions (expires_at);

create table private.access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  appointment_id uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index access_tokens_expires_idx on private.access_tokens (expires_at);

create table private.manage_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index manage_sessions_expires_idx on private.manage_sessions (expires_at);

create table private.rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key_hash, window_start)
);
create index rate_limits_window_idx on private.rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Citas (incluye retenciones)
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete restrict,
  status public.appointment_status not null,
  origin public.appointment_origin not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes between 0 and 120),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 120),
  occupied tstzrange not null,
  blocks_capacity boolean not null,
  hold_expires_at timestamptz,
  pending_expires_at timestamptz,
  booking_session_id uuid references private.booking_sessions (id) on delete set null,
  idempotency_key uuid unique,
  version integer not null default 1,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('patient', 'staff', 'system')),
  cancellation_reason text check (cancellation_reason in (
    'patient_request', 'clinic_reschedule', 'no_longer_needed', 'duplicate', 'other'
  )),
  -- Nota administrativa (NO clínica). Limitada y advertida en la interfaz.
  admin_note text check (char_length(admin_note) <= 500),
  policy_version text check (char_length(policy_version) <= 40),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (ends_at > starts_at),
  constraint appointments_hold_check check (status <> 'hold' or hold_expires_at is not null),
  constraint appointments_contact_check check (status in ('hold', 'expired') or contact_id is not null),
  constraint appointments_no_overlap exclude using gist (doctor_id with =, occupied with &&) where (blocks_capacity)
);
create index appointments_starts_idx on public.appointments (starts_at);
create index appointments_doctor_starts_idx on public.appointments (doctor_id, starts_at);
create index appointments_contact_idx on public.appointments (contact_id);
create index appointments_status_idx on public.appointments (status) where blocks_capacity;
create index appointments_session_idx on public.appointments (booking_session_id) where status = 'hold';

create table public.appointment_resource_claims (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,
  occupied tstzrange not null,
  blocks_capacity boolean not null,
  primary key (appointment_id, resource_id),
  constraint resource_claims_no_overlap exclude using gist (resource_id with =, occupied with &&) where (blocks_capacity)
);

create table public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  at timestamptz not null default now(),
  actor_kind text not null check (actor_kind in ('patient', 'staff', 'system')),
  actor_user_id uuid references auth.users (id) on delete set null,
  event text not null check (char_length(event) <= 60),
  from_status public.appointment_status,
  to_status public.appointment_status,
  -- Sólo datos técnicos (horas, IDs, códigos). Nunca texto clínico ni datos de contacto.
  details jsonb not null default '{}'::jsonb
);
create index appointment_events_appt_idx on public.appointment_events (appointment_id, at);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  purpose text not null check (purpose in ('booking_privacy', 'marketing')),
  granted boolean not null,
  document_version text not null check (char_length(document_version) <= 40),
  source text not null check (source in ('web', 'staff')),
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index consent_records_contact_idx on public.consent_records (contact_id);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'booking_received', 'booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'booking_reminder',
    'booking_pending_expired', 'access_link', 'staff_new_booking', 'staff_booking_cancelled',
    'staff_contact_request', 'staff_complaint'
  )),
  channel text not null default 'email' check (channel in ('email', 'whatsapp')),
  recipient text not null check (recipient in ('patient', 'reception')),
  appointment_id uuid references public.appointments (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  ref_id uuid,
  appointment_version integer,
  dedupe_key text not null unique check (char_length(dedupe_key) <= 200),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped', 'cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 6 check (max_attempts between 1 and 20),
  scheduled_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  locked_by text,
  last_error text check (char_length(last_error) <= 300),
  provider_message_id text check (char_length(provider_message_id) <= 200),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notification_outbox_due_idx on public.notification_outbox (next_attempt_at) where status in ('pending', 'sending');
create index notification_outbox_appt_idx on public.notification_outbox (appointment_id);
create trigger notification_outbox_touch before update on public.notification_outbox
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Triggers de citas: rango ocupado, bloqueo, versión, transiciones y recursos
-- ---------------------------------------------------------------------------
create or replace function private.appointments_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_ok := case old.status
      when 'hold' then new.status in ('pending_confirmation', 'confirmed', 'expired')
      when 'pending_confirmation' then new.status in ('confirmed', 'cancelled', 'expired')
      when 'confirmed' then new.status in ('cancelled', 'completed', 'no_show')
      when 'completed' then new.status in ('no_show')
      when 'no_show' then new.status in ('completed')
      when 'expired' then new.status in ('confirmed', 'pending_confirmation')
      when 'cancelled' then new.status in ('confirmed')
      else false end;
    if not v_ok then
      raise exception 'invalid_status_transition: % → %', old.status, new.status using errcode = '22023';
    end if;
  end if;
  if tg_op = 'INSERT' and new.status not in ('hold', 'pending_confirmation', 'confirmed') then
    raise exception 'invalid_initial_status' using errcode = '22023';
  end if;

  new.occupied := tstzrange(
    new.starts_at - make_interval(mins => new.buffer_before_minutes),
    new.ends_at + make_interval(mins => new.buffer_after_minutes),
    '[)'
  );
  new.blocks_capacity := new.status in ('hold', 'pending_confirmation', 'confirmed');
  if new.status <> 'hold' then
    new.hold_expires_at := null;
  end if;
  if new.status <> 'pending_confirmation' then
    new.pending_expires_at := null;
  end if;

  if tg_op = 'UPDATE' then
    if new.doctor_id is distinct from old.doctor_id or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at or new.status is distinct from old.status then
      new.version := old.version + 1;
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function private.appointments_before_write();

create or replace function private.appointments_sync_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.appointment_resource_claims c
  where c.appointment_id = new.id
    and c.resource_id not in (select sr.resource_id from public.service_resources sr where sr.service_id = new.service_id);
  insert into public.appointment_resource_claims (appointment_id, resource_id, occupied, blocks_capacity)
  select new.id, sr.resource_id, new.occupied, new.blocks_capacity
  from public.service_resources sr where sr.service_id = new.service_id
  on conflict (appointment_id, resource_id) do update
    set occupied = excluded.occupied, blocks_capacity = excluded.blocks_capacity;
  return null;
end;
$$;

-- Nota: `UPDATE OF col` no se dispara con columnas que fija un trigger BEFORE; por eso se compara OLD/NEW.
create trigger appointments_sync_resources_ins after insert
  on public.appointments for each row execute function private.appointments_sync_resources();
create trigger appointments_sync_resources_upd after update
  on public.appointments for each row
  when (old.occupied is distinct from new.occupied or old.blocks_capacity is distinct from new.blocks_capacity
        or old.service_id is distinct from new.service_id)
  execute function private.appointments_sync_resources();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.settings()
returns public.clinic_settings_private
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.clinic_settings_private where id;
$$;

create or replace function private.mask_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_email is null then null
    else left(split_part(p_email, '@', 1), 1) || '•••@' || split_part(p_email, '@', 2) end;
$$;

create or replace function private.log_event(
  p_appointment_id uuid, p_actor_kind text, p_event text,
  p_from public.appointment_status, p_to public.appointment_status, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.appointment_events (appointment_id, actor_kind, actor_user_id, event, from_status, to_status, details)
  values (p_appointment_id, p_actor_kind, (select auth.uid()), p_event, p_from, p_to, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function private.enqueue(
  p_kind text, p_recipient text, p_appointment_id uuid, p_contact_id uuid, p_version integer,
  p_dedupe_key text, p_scheduled_at timestamptz default now(), p_ref_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient = 'reception' and (private.settings()).reception_notification_email is null then
    return; -- Sin correo de recepción configurado: el panel lo advierte; no se finge un envío.
  end if;
  if p_recipient = 'patient' and not exists (
    select 1 from public.contacts c where c.id = p_contact_id and c.email is not null and c.anonymized_at is null
  ) then
    return;
  end if;
  insert into public.notification_outbox (kind, recipient, appointment_id, contact_id, appointment_version,
    dedupe_key, scheduled_at, next_attempt_at, ref_id)
  values (p_kind, p_recipient, p_appointment_id, p_contact_id, p_version, p_dedupe_key, p_scheduled_at, p_scheduled_at, p_ref_id)
  on conflict (dedupe_key) do nothing;
end;
$$;

-- Avisos que siguen a un cambio de estado/horario de una cita (misma transacción que el cambio).
create or replace function private.enqueue_for_appointment(p_appointment_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.appointments;
  cfg public.clinic_settings_private := private.settings();
  v_reminder_at timestamptz;
begin
  select * into a from public.appointments where id = p_appointment_id;
  if p_kind in ('booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'booking_pending_expired') then
    -- Recordatorios pendientes de versiones anteriores quedan obsoletos.
    update public.notification_outbox o set status = 'cancelled', last_error = 'superseded'
    where o.appointment_id = a.id and o.kind = 'booking_reminder' and o.status in ('pending', 'failed')
      and o.appointment_version is distinct from a.version;
  end if;

  perform private.enqueue(p_kind, 'patient', a.id, a.contact_id, a.version,
    format('%s:%s:v%s', p_kind, a.id, a.version));

  if a.status = 'confirmed' and p_kind in ('booking_confirmed', 'booking_rescheduled') then
    v_reminder_at := a.starts_at - make_interval(hours => cfg.reminder_hours_before);
    if v_reminder_at > now() + interval '30 minutes' then
      perform private.enqueue('booking_reminder', 'patient', a.id, a.contact_id, a.version,
        format('booking_reminder:%s:v%s', a.id, a.version), v_reminder_at);
    end if;
  end if;

  if p_kind in ('booking_received', 'booking_confirmed') and a.origin = 'web' then
    perform private.enqueue('staff_new_booking', 'reception', a.id, null, a.version,
      format('staff_new_booking:%s', a.id));
  elsif p_kind = 'booking_cancelled' and a.cancelled_by = 'patient' then
    perform private.enqueue('staff_booking_cancelled', 'reception', a.id, null, a.version,
      format('staff_booking_cancelled:%s:v%s', a.id, a.version));
  end if;
end;
$$;

-- Marca vencidos los holds/solicitudes pendientes que se solapan con un intervalo (limpieza en la
-- transacción de adquisición; el job hace lo mismo globalmente).
create or replace function private.expire_stale(p_range tstzrange default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_n integer;
  r record;
begin
  with x as (
    update public.appointments a set status = 'expired'
    where a.status = 'hold' and a.hold_expires_at <= now()
      and (p_range is null or a.occupied && p_range)
    returning a.id
  )
  select count(*) into v_n from x;
  v_count := v_count + v_n;

  for r in
    update public.appointments a set status = 'expired'
    where a.status = 'pending_confirmation' and a.pending_expires_at <= now()
      and (p_range is null or a.occupied && p_range)
    returning a.id
  loop
    perform private.log_event(r.id, 'system', 'pending_expired', 'pending_confirmation', 'expired');
    perform private.enqueue_for_appointment(r.id, 'booking_pending_expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cálculo de disponibilidad (desde la base de datos; nunca un array fijo en el frontend)
--   p_channel = 'web'   → exige publicación, reserva online, antelación mínima y horizonte.
--   p_channel = 'staff' → mismas reglas de horario/excepciones/capacidad, sin antelación mínima.
-- ---------------------------------------------------------------------------
create or replace function private.compute_slots(
  p_service_id uuid, p_doctor_id uuid, p_from date, p_to date, p_channel text, p_exclude_id uuid default null
)
returns table (doctor_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select s.min_notice_minutes, s.max_horizon_days from public.clinic_settings_private s where s.id
  ),
  offer as (
    select ds.doctor_id, ds.duration_minutes, ds.buffer_before_minutes, ds.buffer_after_minutes
    from public.doctor_services ds
    join public.doctors d on d.id = ds.doctor_id and d.active
    join public.services sv on sv.id = ds.service_id and sv.active
    where ds.service_id = p_service_id and ds.active
      and (p_doctor_id is null or ds.doctor_id = p_doctor_id)
      and not exists (
        select 1 from public.service_resources sr join public.resources rs on rs.id = sr.resource_id
        where sr.service_id = p_service_id and not rs.active
      )
      and (p_channel <> 'web' or (
        ds.online_booking and d.online_booking_enabled and sv.online_booking_enabled
        and exists (select 1 from public.published_content pc where pc.entity_type = 'doctor' and pc.entity_id = d.id)
        and exists (select 1 from public.published_content pc where pc.entity_type = 'service' and pc.entity_id = sv.id)
      ))
  ),
  days as (
    select g::date as day
    from generate_series(p_from::timestamp, least(p_to, p_from + 62)::timestamp, interval '1 day') g
  ),
  candidates as (
    select o.doctor_id, o.duration_minutes, o.buffer_before_minutes, o.buffer_after_minutes,
      ((dy.day + r.start_time) at time zone r.timezone) + make_interval(mins => n.k * r.slot_interval_minutes) as starts_at
    from offer o
    join public.schedule_rules r on r.doctor_id = o.doctor_id and r.active
    join days dy on extract(isodow from dy.day) = r.weekday
      and dy.day >= r.valid_from and (r.valid_until is null or dy.day <= r.valid_until)
    cross join lateral generate_series(
      0,
      case when (extract(epoch from (r.end_time - r.start_time)) / 60)::integer >= o.duration_minutes
        then ((extract(epoch from (r.end_time - r.start_time)) / 60)::integer - o.duration_minutes) / r.slot_interval_minutes
        else -1 end
    ) as n(k)
  ),
  slots as (
    select distinct c.doctor_id, c.starts_at,
      c.starts_at + make_interval(mins => c.duration_minutes) as ends_at,
      tstzrange(c.starts_at - make_interval(mins => c.buffer_before_minutes),
                c.starts_at + make_interval(mins => c.duration_minutes + c.buffer_after_minutes), '[)') as occupied
    from candidates c
  )
  select s.doctor_id, s.starts_at, s.ends_at
  from slots s cross join cfg
  where s.starts_at > now()
    and (p_channel <> 'web' or (
      s.starts_at >= now() + make_interval(mins => cfg.min_notice_minutes)
      and s.starts_at < now() + make_interval(days => cfg.max_horizon_days)
    ))
    and not exists (
      select 1 from public.schedule_exceptions e
      where (e.doctor_id is null or e.doctor_id = s.doctor_id)
        and e.period && tstzrange(s.starts_at, s.ends_at, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.doctor_id = s.doctor_id and a.blocks_capacity and a.occupied && s.occupied
        and (p_exclude_id is null or a.id <> p_exclude_id)
        and (a.status <> 'hold' or a.hold_expires_at > now())
        and (a.status <> 'pending_confirmation' or a.pending_expires_at is null or a.pending_expires_at > now())
    )
    and not exists (
      select 1
      from public.service_resources sr
      join public.appointment_resource_claims rc on rc.resource_id = sr.resource_id and rc.blocks_capacity
      join public.appointments a on a.id = rc.appointment_id
      where sr.service_id = p_service_id and rc.occupied && s.occupied
        and (p_exclude_id is null or rc.appointment_id <> p_exclude_id)
        and (a.status <> 'hold' or a.hold_expires_at > now())
        and (a.status <> 'pending_confirmation' or a.pending_expires_at is null or a.pending_expires_at > now())
    )
  order by s.starts_at, s.doctor_id;
$$;

-- Devuelve la combinación profesional-servicio si (p_doctor, p_start) es un horario válido.
create or replace function private.validate_slot(
  p_service_id uuid, p_doctor_id uuid, p_starts_at timestamptz, p_channel text, p_exclude_id uuid default null
)
returns public.doctor_services
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day date := (p_starts_at at time zone 'America/Lima')::date;
  v_offer public.doctor_services;
begin
  if not exists (
    select 1 from private.compute_slots(p_service_id, p_doctor_id, v_day, v_day, p_channel, p_exclude_id) s
    where s.doctor_id = p_doctor_id and s.starts_at = p_starts_at
  ) then
    return null;
  end if;
  select * into v_offer from public.doctor_services ds where ds.doctor_id = p_doctor_id and ds.service_id = p_service_id;
  return v_offer;
end;
$$;

create or replace function private.session_by_hash(p_token_hash text)
returns private.booking_sessions
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.booking_sessions s where s.token_hash = p_token_hash and s.expires_at > now();
$$;

create or replace function private.appointment_public_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'appointment_id', a.id, 'status', a.status, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
    'doctor_id', a.doctor_id, 'service_id', a.service_id, 'version', a.version,
    'hold_expires_at', a.hold_expires_at, 'pending_expires_at', a.pending_expires_at
  )
  from public.appointments a where a.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- API de reserva web (EXECUTE sólo service_role; la invoca el servidor Next tras validar y limitar)
-- ---------------------------------------------------------------------------
create or replace function public.booking_slots(p_service_id uuid, p_doctor_id uuid, p_from date, p_to date)
returns table (doctor_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.compute_slots(p_service_id, p_doctor_id, p_from, p_to, 'web', null);
$$;

create or replace function public.booking_session_create(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz := now() + make_interval(hours => (private.settings()).booking_session_hours);
begin
  insert into private.booking_sessions (token_hash, expires_at) values (p_token_hash, v_expires);
  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

create or replace function public.booking_session_state(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_token_hash);
  v_hold uuid;
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  select a.id into v_hold from public.appointments a
  where a.booking_session_id = s.id and a.status = 'hold' and a.hold_expires_at > now()
  order by a.created_at desc limit 1;
  return jsonb_build_object(
    'ok', true,
    'verified', s.verified_at is not null,
    'verified_email', private.mask_email(s.verified_email),
    'code_pending', s.code_hash is not null and s.code_expires_at > now(),
    'hold', case when v_hold is null then null else private.appointment_public_json(v_hold) end
  );
end;
$$;

create or replace function public.booking_create_hold(
  p_session_hash text, p_service_id uuid, p_doctor_id uuid, p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  v_offer public.doctor_services;
  v_id uuid;
  v_range tstzrange;
  v_ends timestamptz;
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  if (select booking_mode from public.clinic_settings_public where id) = 'off' then
    return jsonb_build_object('ok', false, 'code', 'booking_disabled');
  end if;

  -- Reintento/doble clic de la misma sesión sobre el mismo horario → misma retención.
  select a.id into v_id from public.appointments a
  where a.booking_session_id = s.id and a.status = 'hold' and a.hold_expires_at > now()
    and a.doctor_id = p_doctor_id and a.service_id = p_service_id and a.starts_at = p_starts_at;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'hold', private.appointment_public_json(v_id));
  end if;

  select ds.* into v_offer from public.doctor_services ds
  where ds.doctor_id = p_doctor_id and ds.service_id = p_service_id;
  if v_offer.doctor_id is null then
    return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
  end if;
  -- Duración y buffers los decide el servidor con la configuración vigente.
  v_ends := p_starts_at + make_interval(mins => v_offer.duration_minutes);
  v_range := tstzrange(p_starts_at - make_interval(mins => v_offer.buffer_before_minutes),
                       v_ends + make_interval(mins => v_offer.buffer_after_minutes), '[)');

  begin
    perform private.expire_stale(v_range);
    -- Una retención activa por sesión: se libera la anterior (se revierte si este intento falla).
    update public.appointments a set status = 'expired'
    where a.booking_session_id = s.id and a.status = 'hold';
    if private.validate_slot(p_service_id, p_doctor_id, p_starts_at, 'web') is null then
      raise exception 'slot_unavailable' using errcode = 'OG001';
    end if;

    insert into public.appointments (doctor_id, service_id, status, origin, starts_at, ends_at,
      buffer_before_minutes, buffer_after_minutes, hold_expires_at, booking_session_id)
    values (p_doctor_id, p_service_id, 'hold', 'web', p_starts_at, v_ends,
      v_offer.buffer_before_minutes, v_offer.buffer_after_minutes,
      now() + make_interval(mins => cfg.hold_minutes), s.id)
    returning id into v_id;
  exception when exclusion_violation then
    -- Otra transacción ganó el intervalo (o fue un doble clic concurrente de esta sesión).
    select a.id into v_id from public.appointments a
    where a.booking_session_id = s.id and a.status = 'hold' and a.hold_expires_at > now()
      and a.doctor_id = p_doctor_id and a.starts_at = p_starts_at;
    if v_id is not null then
      return jsonb_build_object('ok', true, 'hold', private.appointment_public_json(v_id));
    end if;
    return jsonb_build_object('ok', false, 'code', 'slot_taken');
  when sqlstate 'OG001' then
    return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
  end;

  perform private.log_event(v_id, 'patient', 'hold_created', null, 'hold');
  return jsonb_build_object('ok', true, 'hold', private.appointment_public_json(v_id));
end;
$$;

create or replace function public.booking_release_hold(p_session_hash text, p_hold_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  update public.appointments a set status = 'expired'
  where a.id = p_hold_id and a.booking_session_id = s.id and a.status = 'hold';
  if found then
    perform private.log_event(p_hold_id, 'patient', 'hold_released', 'hold', 'expired');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Guarda contacto pendiente y el hash del código (el código lo genera y envía el servidor).
create or replace function public.booking_start_verification(
  p_session_hash text, p_name text, p_email text, p_phone text, p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  v_email text := lower(trim(p_email));
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  if s.verified_at is not null and s.verified_email = v_email then
    update private.booking_sessions set pending_name = p_name, pending_phone = p_phone where id = s.id;
    update public.contacts c set full_name = p_name, phone_e164 = coalesce(p_phone, c.phone_e164)
    where c.id = s.contact_id;
    return jsonb_build_object('ok', true, 'already_verified', true);
  end if;
  if s.codes_sent >= 5 then
    return jsonb_build_object('ok', false, 'code', 'too_many_codes');
  end if;
  update private.booking_sessions set
    pending_name = p_name, pending_email = v_email, pending_phone = p_phone,
    code_hash = p_code_hash, code_expires_at = now() + make_interval(mins => cfg.verification_code_ttl_minutes),
    code_attempts = 0, codes_sent = codes_sent + 1,
    verified_at = null, verified_email = null, contact_id = null
  where id = s.id;
  return jsonb_build_object('ok', true, 'already_verified', false,
    'code_expires_at', now() + make_interval(mins => cfg.verification_code_ttl_minutes));
end;
$$;

create or replace function public.booking_verify_code(p_session_hash text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  v_contact uuid;
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  if s.code_hash is null or s.code_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'code_expired');
  end if;
  if s.code_attempts >= cfg.verification_max_attempts then
    return jsonb_build_object('ok', false, 'code', 'too_many_attempts');
  end if;
  update private.booking_sessions set code_attempts = code_attempts + 1 where id = s.id;
  if s.code_hash <> p_code_hash then
    return jsonb_build_object('ok', false, 'code', 'code_invalid',
      'attempts_left', cfg.verification_max_attempts - s.code_attempts - 1);
  end if;

  insert into public.contacts as c (full_name, email, email_verified_at, phone_e164)
  values (s.pending_name, s.pending_email, now(), s.pending_phone)
  on conflict (email) where email_verified_at is not null do update
    set full_name = excluded.full_name, phone_e164 = coalesce(excluded.phone_e164, c.phone_e164)
  returning id into v_contact;

  update private.booking_sessions set
    contact_id = v_contact, verified_email = s.pending_email, verified_at = now(),
    code_hash = null, code_expires_at = null
  where id = s.id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.booking_confirm(
  p_session_hash text, p_hold_id uuid, p_idempotency_key uuid, p_privacy_version text, p_marketing boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  v_mode public.booking_mode := (select booking_mode from public.clinic_settings_public where id);
  a public.appointments;
  v_existing public.appointments;
  v_status public.appointment_status;
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  if p_idempotency_key is null or p_hold_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_request');
  end if;

  -- Idempotencia: el mismo intento devuelve el mismo resultado.
  select * into v_existing from public.appointments where idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.booking_session_id is distinct from s.id then
      return jsonb_build_object('ok', false, 'code', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'replayed', true, 'appointment', private.appointment_public_json(v_existing.id));
  end if;

  if v_mode = 'off' then
    return jsonb_build_object('ok', false, 'code', 'booking_disabled');
  end if;
  if s.verified_at is null or s.contact_id is null then
    return jsonb_build_object('ok', false, 'code', 'contact_unverified');
  end if;
  if p_privacy_version is null or char_length(p_privacy_version) = 0 then
    return jsonb_build_object('ok', false, 'code', 'consent_required');
  end if;

  select * into a from public.appointments where id = p_hold_id and booking_session_id = s.id for update;
  if a.id is null then
    return jsonb_build_object('ok', false, 'code', 'hold_not_found');
  end if;
  -- Doble envío concurrente con la misma clave: el segundo espera el bloqueo y ve el resultado.
  if a.idempotency_key = p_idempotency_key then
    return jsonb_build_object('ok', true, 'replayed', true, 'appointment', private.appointment_public_json(a.id));
  end if;
  if a.status <> 'hold' then
    return jsonb_build_object('ok', false, 'code', 'hold_expired');
  end if;
  if a.hold_expires_at <= now() then
    update public.appointments set status = 'expired' where id = a.id;
    perform private.log_event(a.id, 'system', 'hold_expired', 'hold', 'expired');
    return jsonb_build_object('ok', false, 'code', 'hold_expired');
  end if;

  v_status := case v_mode when 'automatic' then 'confirmed' else 'pending_confirmation' end;
  update public.appointments set
    status = v_status,
    contact_id = s.contact_id,
    idempotency_key = p_idempotency_key,
    policy_version = p_privacy_version,
    confirmed_at = case when v_status = 'confirmed' then now() end,
    pending_expires_at = case when v_status = 'pending_confirmation'
      then least(now() + make_interval(hours => cfg.pending_expiry_hours), a.starts_at) end
  where id = a.id;

  insert into public.consent_records (contact_id, appointment_id, purpose, granted, document_version, source)
  values (s.contact_id, a.id, 'booking_privacy', true, p_privacy_version, 'web'),
         (s.contact_id, a.id, 'marketing', coalesce(p_marketing, false), p_privacy_version, 'web');

  perform private.log_event(a.id, 'patient', 'booked', 'hold', v_status);
  perform private.enqueue_for_appointment(a.id,
    case v_status when 'confirmed' then 'booking_confirmed' else 'booking_received' end);
  perform private.audit('booking.confirm', 'appointment', a.id::text, jsonb_build_object('status', v_status), 'patient');

  return jsonb_build_object('ok', true, 'replayed', false, 'appointment', private.appointment_public_json(a.id));
end;
$$;

create or replace function public.booking_result(p_session_hash text, p_idempotency_key uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_session_hash);
  v_id uuid;
begin
  if s.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  select a.id into v_id from public.appointments a
  where a.idempotency_key = p_idempotency_key and a.booking_session_id = s.id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(v_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Autogestión sin cuenta: token opaco (hash) → sesión corta → acciones por POST
-- ---------------------------------------------------------------------------
create or replace function public.manage_issue_token(p_contact_id uuid, p_appointment_id uuid, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz := now() + make_interval(hours => (private.settings()).access_link_ttl_hours);
begin
  insert into private.access_tokens (token_hash, contact_id, appointment_id, expires_at)
  values (p_token_hash, p_contact_id, p_appointment_id, v_expires);
  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

create or replace function public.manage_redeem(p_token_hash text, p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t private.access_tokens;
begin
  update private.access_tokens set used_at = now()
  where token_hash = p_token_hash and used_at is null and expires_at > now()
  returning * into t;
  if t.id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_or_expired');
  end if;
  insert into private.manage_sessions (token_hash, contact_id, expires_at)
  values (p_session_hash, t.contact_id, now() + make_interval(mins => (private.settings()).manage_session_minutes));
  perform private.audit('manage.redeem', 'contact', t.contact_id::text, '{}'::jsonb, 'patient');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.manage_session(p_session_hash text)
returns private.manage_sessions
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.manage_sessions m
  where m.token_hash = p_session_hash and m.expires_at > now() and m.revoked_at is null;
$$;

-- Tras verificar el correo en el flujo de reserva, el navegador puede gestionar sin enlace.
create or replace function public.manage_session_from_booking(p_booking_session_hash text, p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.booking_sessions := private.session_by_hash(p_booking_session_hash);
begin
  if s.id is null or s.contact_id is null or s.verified_at is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  insert into private.manage_sessions (token_hash, contact_id, expires_at)
  values (p_session_hash, s.contact_id, now() + make_interval(mins => (private.settings()).manage_session_minutes));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.manage_overview(p_session_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m private.manage_sessions := private.manage_session(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
begin
  if m.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  return jsonb_build_object(
    'ok', true,
    'cancellation_window_hours', cfg.cancellation_window_hours,
    'session_expires_at', m.expires_at,
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'appointment_id', a.id, 'status', a.status, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
        'doctor_id', a.doctor_id, 'service_id', a.service_id,
        'can_change', a.status in ('pending_confirmation', 'confirmed')
          and a.starts_at - now() >= make_interval(hours => cfg.cancellation_window_hours)
      ) order by a.starts_at)
      from public.appointments a
      where a.contact_id = m.contact_id
        and a.status in ('pending_confirmation', 'confirmed')
        and a.starts_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.manage_cancel(p_session_hash text, p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m private.manage_sessions := private.manage_session(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  a public.appointments;
begin
  if m.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  select * into a from public.appointments
  where id = p_appointment_id and contact_id = m.contact_id for update;
  if a.id is null or a.status not in ('pending_confirmation', 'confirmed') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if a.starts_at - now() < make_interval(hours => cfg.cancellation_window_hours) then
    return jsonb_build_object('ok', false, 'code', 'outside_window');
  end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'patient',
    cancellation_reason = 'patient_request'
  where id = a.id;
  perform private.log_event(a.id, 'patient', 'cancelled', a.status, 'cancelled');
  perform private.enqueue_for_appointment(a.id, 'booking_cancelled');
  perform private.audit('manage.cancel', 'appointment', a.id::text, '{}'::jsonb, 'patient');
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(a.id));
end;
$$;

create or replace function public.manage_reschedule(
  p_session_hash text, p_appointment_id uuid, p_doctor_id uuid, p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m private.manage_sessions := private.manage_session(p_session_hash);
  cfg public.clinic_settings_private := private.settings();
  a public.appointments;
  v_offer public.doctor_services;
  v_ends timestamptz;
begin
  if m.id is null then
    return jsonb_build_object('ok', false, 'code', 'session_invalid');
  end if;
  select * into a from public.appointments
  where id = p_appointment_id and contact_id = m.contact_id for update;
  if a.id is null or a.status not in ('pending_confirmation', 'confirmed') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if a.starts_at - now() < make_interval(hours => cfg.cancellation_window_hours) then
    return jsonb_build_object('ok', false, 'code', 'outside_window');
  end if;

  begin
    v_offer := private.validate_slot(a.service_id, p_doctor_id, p_starts_at, 'web', a.id);
    if v_offer.doctor_id is null then
      return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
    end if;
    v_ends := p_starts_at + make_interval(mins => v_offer.duration_minutes);
    perform private.expire_stale(tstzrange(p_starts_at - make_interval(mins => v_offer.buffer_before_minutes),
      v_ends + make_interval(mins => v_offer.buffer_after_minutes), '[)'));
    -- Adquiere el destino y libera el origen en la MISMA fila y sentencia: o todo o nada.
    update public.appointments set doctor_id = p_doctor_id, starts_at = p_starts_at, ends_at = v_ends,
      buffer_before_minutes = v_offer.buffer_before_minutes, buffer_after_minutes = v_offer.buffer_after_minutes
    where id = a.id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'slot_taken');
  end;

  perform private.log_event(a.id, 'patient', 'rescheduled', a.status, a.status,
    jsonb_build_object('from', a.starts_at, 'to', p_starts_at));
  perform private.enqueue_for_appointment(a.id, 'booking_rescheduled');
  perform private.audit('manage.reschedule', 'appointment', a.id::text, '{}'::jsonb, 'patient');
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(a.id));
end;
$$;

create or replace function public.manage_logout(p_session_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.manage_sessions set revoked_at = now() where token_hash = p_session_hash;
$$;

-- Reenvío de acceso: respuesta siempre genérica (no revela si el email existe).
create or replace function public.manage_request_link(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact uuid;
begin
  select c.id into v_contact from public.contacts c
  where c.email = lower(trim(p_email)) and c.email_verified_at is not null and c.anonymized_at is null
    and exists (select 1 from public.appointments a where a.contact_id = c.id
                and a.status in ('pending_confirmation', 'confirmed') and a.starts_at > now());
  if v_contact is not null then
    perform private.enqueue('access_link', 'patient', null, v_contact, null,
      format('access_link:%s:%s', v_contact, to_char(date_trunc('hour', now()), 'YYYYMMDDHH24')));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Outbox: reclamo con lease, contexto para renderizar y cierre con backoff
-- ---------------------------------------------------------------------------
create or replace function public.outbox_claim(p_worker text, p_limit integer default 20, p_lease_seconds integer default 120)
returns setof public.notification_outbox
language sql
security definer
set search_path = ''
as $$
  with due as (
    select o.id from public.notification_outbox o
    where (o.status = 'pending' and o.next_attempt_at <= now())
       or (o.status = 'sending' and o.locked_until < now())
    order by o.next_attempt_at
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.notification_outbox o set
    status = 'sending', locked_by = p_worker,
    locked_until = now() + make_interval(secs => p_lease_seconds),
    attempts = o.attempts + 1
  from due where o.id = due.id
  returning o.*;
$$;

create or replace function public.outbox_context(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.notification_outbox;
  a public.appointments;
  c public.contacts;
  cfg public.clinic_settings_private := private.settings();
  v_stale boolean := false;
begin
  select * into o from public.notification_outbox where id = p_id;
  if o.id is null then
    return null;
  end if;
  if o.appointment_id is not null then
    select * into a from public.appointments where id = o.appointment_id;
    v_stale := a.id is null
      or (o.kind <> 'staff_new_booking' and o.appointment_version is distinct from a.version)
      or (o.kind = 'booking_reminder' and a.status <> 'confirmed');
  end if;
  if o.contact_id is not null then
    select * into c from public.contacts where id = o.contact_id;
    if c.anonymized_at is not null then
      v_stale := true;
    end if;
  end if;
  return jsonb_build_object(
    'id', o.id, 'kind', o.kind, 'recipient', o.recipient, 'dedupe_key', o.dedupe_key, 'stale', v_stale,
    'to', case o.recipient when 'patient' then c.email else cfg.reception_notification_email end,
    'contact_id', c.id, 'first_name', split_part(c.full_name, ' ', 1),
    'appointment', case when a.id is null then null else jsonb_build_object(
      'id', a.id, 'status', a.status, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
      'doctor_id', a.doctor_id, 'service_id', a.service_id, 'origin', a.origin) end,
    'ref_id', o.ref_id
  );
end;
$$;

create or replace function public.outbox_complete(
  p_id uuid, p_worker text, p_result text, p_error text default null, p_provider_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.notification_outbox;
begin
  select * into o from public.notification_outbox where id = p_id for update;
  if o.id is null or o.status <> 'sending' or o.locked_by is distinct from p_worker then
    return; -- El lease expiró y otro worker lo tomó: no pisar su resultado.
  end if;
  if p_result = 'sent' then
    update public.notification_outbox set status = 'sent', sent_at = now(), provider_message_id = p_provider_id,
      locked_by = null, locked_until = null, last_error = null where id = p_id;
  elsif p_result = 'skipped' then
    update public.notification_outbox set status = 'skipped', locked_by = null, locked_until = null,
      last_error = left(p_error, 300) where id = p_id;
  elsif p_result = 'retry' and o.attempts < o.max_attempts then
    update public.notification_outbox set status = 'pending', locked_by = null, locked_until = null,
      last_error = left(p_error, 300),
      next_attempt_at = now() + least(interval '6 hours', make_interval(mins => (power(2, o.attempts))::integer))
    where id = p_id;
  else
    update public.notification_outbox set status = 'failed', locked_by = null, locked_until = null,
      last_error = left(coalesce(p_error, 'failed'), 300) where id = p_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Job de mantenimiento (Vercel Cron → endpoint protegido → esta función)
-- ---------------------------------------------------------------------------
create or replace function public.jobs_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
  v_sessions integer;
  v_tokens integer;
begin
  v_expired := private.expire_stale(null);
  delete from private.booking_sessions s where s.expires_at < now() - interval '1 day';
  get diagnostics v_sessions = row_count;
  delete from private.access_tokens where expires_at < now() - interval '7 days';
  get diagnostics v_tokens = row_count;
  delete from private.manage_sessions where expires_at < now() - interval '1 day';
  delete from private.rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object('expired', v_expired, 'sessions_purged', v_sessions, 'tokens_purged', v_tokens);
end;
$$;

-- Límite de frecuencia persistente (ventana fija). La clave llega ya hasheada.
create or replace function public.rate_limit_hit(p_bucket text, p_key_hash text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, v_window, 1)
  on conflict (bucket, key_hash, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- API de personal (sesión autenticada + rol + MFA comprobados dentro de cada función)
-- ---------------------------------------------------------------------------
create or replace function public.staff_slots(p_service_id uuid, p_doctor_id uuid, p_from date, p_to date)
returns table (doctor_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin', 'reception']::public.staff_role[]);
  return query select * from private.compute_slots(p_service_id, p_doctor_id, p_from, p_to, 'staff', null);
end;
$$;

create or replace function public.staff_create_appointment(
  p_service_id uuid, p_doctor_id uuid, p_starts_at timestamptz,
  p_full_name text, p_phone text, p_email text,
  p_origin public.appointment_origin, p_confirm boolean, p_notify boolean, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin', 'reception']::public.staff_role[]);
  cfg public.clinic_settings_private := private.settings();
  v_offer public.doctor_services;
  v_contact uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
  v_id uuid;
  v_status public.appointment_status := case when p_confirm then 'confirmed' else 'pending_confirmation' end;
begin
  if p_origin = 'web' then
    raise exception 'invalid_origin' using errcode = '22023';
  end if;
  if v_email is null and v_phone is null then
    return jsonb_build_object('ok', false, 'code', 'contact_required');
  end if;

  begin
    v_offer := private.validate_slot(p_service_id, p_doctor_id, p_starts_at, 'staff');
    if v_offer.doctor_id is null then
      return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
    end if;
    perform private.expire_stale(tstzrange(
      p_starts_at - make_interval(mins => v_offer.buffer_before_minutes),
      p_starts_at + make_interval(mins => v_offer.duration_minutes + v_offer.buffer_after_minutes), '[)'));

    if v_email is not null then
      select c.id into v_contact from public.contacts c where c.email = v_email and c.email_verified_at is not null;
    end if;
    if v_contact is null then
      insert into public.contacts (full_name, email, phone_e164, created_by)
      values (p_full_name, v_email, v_phone, v_uid) returning id into v_contact;
    end if;

    insert into public.appointments (doctor_id, service_id, contact_id, status, origin, starts_at, ends_at,
      buffer_before_minutes, buffer_after_minutes, confirmed_at, pending_expires_at, admin_note, created_by, updated_by)
    values (p_doctor_id, p_service_id, v_contact, v_status, p_origin, p_starts_at,
      p_starts_at + make_interval(mins => v_offer.duration_minutes),
      v_offer.buffer_before_minutes, v_offer.buffer_after_minutes,
      case when p_confirm then now() end,
      case when not p_confirm then least(now() + make_interval(hours => cfg.pending_expiry_hours), p_starts_at) end,
      nullif(trim(p_note), ''), v_uid, v_uid)
    returning id into v_id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'slot_taken');
  end;

  perform private.log_event(v_id, 'staff', 'created', null, v_status, jsonb_build_object('origin', p_origin));
  if p_notify then
    perform private.enqueue_for_appointment(v_id, case when p_confirm then 'booking_confirmed' else 'booking_received' end);
  end if;
  perform private.audit('appointment.create', 'appointment', v_id::text, jsonb_build_object('origin', p_origin));
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(v_id));
end;
$$;

create or replace function public.staff_transition_appointment(
  p_appointment_id uuid, p_to public.appointment_status, p_reason text default null, p_notify boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin', 'reception', 'professional']::public.staff_role[]);
  a public.appointments;
  v_desk boolean := private.has_any_role(array['admin', 'reception']::public.staff_role[]);
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if a.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  -- Profesional: sólo su agenda y sólo marcar asistencia.
  if not v_desk then
    if a.doctor_id is distinct from private.current_doctor_id() or p_to not in ('completed', 'no_show') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  if a.status = 'hold' then
    return jsonb_build_object('ok', false, 'code', 'invalid_transition');
  end if;
  if p_to in ('completed', 'no_show') and a.starts_at > now() then
    return jsonb_build_object('ok', false, 'code', 'not_started');
  end if;

  begin
    if p_to = 'confirmed' and a.status in ('expired', 'cancelled') then
      -- Reactivar exige revalidar horario y capacidad (la EXCLUDE vuelve a comprobarse al bloquear).
      if private.validate_slot(a.service_id, a.doctor_id, a.starts_at, 'staff', a.id) is null then
        return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
      end if;
      perform private.expire_stale(a.occupied);
    end if;
    update public.appointments set
      status = p_to, updated_by = v_uid,
      confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
      cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
      cancelled_by = case when p_to = 'cancelled' then 'staff' else cancelled_by end,
      cancellation_reason = case when p_to = 'cancelled' then coalesce(p_reason, 'other') else cancellation_reason end
    where id = a.id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'code', 'slot_taken');
    when sqlstate '22023' then
      return jsonb_build_object('ok', false, 'code', 'invalid_transition');
  end;

  perform private.log_event(a.id, 'staff', 'status_changed', a.status, p_to);
  if p_notify and p_to in ('confirmed', 'cancelled') then
    perform private.enqueue_for_appointment(a.id, case p_to when 'confirmed' then 'booking_confirmed' else 'booking_cancelled' end);
  end if;
  perform private.audit('appointment.status', 'appointment', a.id::text,
    jsonb_build_object('from', a.status, 'to', p_to));
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(a.id));
end;
$$;

create or replace function public.staff_reschedule_appointment(
  p_appointment_id uuid, p_doctor_id uuid, p_starts_at timestamptz, p_notify boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin', 'reception']::public.staff_role[]);
  a public.appointments;
  v_offer public.doctor_services;
  v_ends timestamptz;
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if a.id is null or a.status not in ('pending_confirmation', 'confirmed') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  begin
    v_offer := private.validate_slot(a.service_id, p_doctor_id, p_starts_at, 'staff', a.id);
    if v_offer.doctor_id is null then
      return jsonb_build_object('ok', false, 'code', 'slot_unavailable');
    end if;
    v_ends := p_starts_at + make_interval(mins => v_offer.duration_minutes);
    perform private.expire_stale(tstzrange(p_starts_at - make_interval(mins => v_offer.buffer_before_minutes),
      v_ends + make_interval(mins => v_offer.buffer_after_minutes), '[)'));
    update public.appointments set doctor_id = p_doctor_id, starts_at = p_starts_at, ends_at = v_ends,
      buffer_before_minutes = v_offer.buffer_before_minutes, buffer_after_minutes = v_offer.buffer_after_minutes,
      updated_by = v_uid
    where id = a.id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'slot_taken');
  end;
  perform private.log_event(a.id, 'staff', 'rescheduled', a.status, a.status,
    jsonb_build_object('from', a.starts_at, 'to', p_starts_at));
  if p_notify then
    perform private.enqueue_for_appointment(a.id, 'booking_rescheduled');
  end if;
  perform private.audit('appointment.reschedule', 'appointment', a.id::text, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'appointment', private.appointment_public_json(a.id));
end;
$$;

create or replace function public.staff_update_appointment_note(p_appointment_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_staff(array['admin', 'reception']::public.staff_role[]);
begin
  update public.appointments set admin_note = nullif(trim(p_note), ''), updated_by = v_uid where id = p_appointment_id;
  perform private.audit('appointment.note', 'appointment', p_appointment_id::text, '{}'::jsonb);
  return jsonb_build_object('ok', found);
end;
$$;

create or replace function public.staff_retry_notification(p_outbox_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff(array['admin', 'reception']::public.staff_role[]);
  update public.notification_outbox set status = 'pending', next_attempt_at = now(),
    max_attempts = greatest(max_attempts, attempts + 3)
  where id = p_outbox_id and status = 'failed';
  perform private.audit('notification.retry', 'notification', p_outbox_id::text, '{}'::jsonb);
  return jsonb_build_object('ok', found);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.appointments enable row level security;
alter table public.appointment_resource_claims enable row level security;
alter table public.appointment_events enable row level security;
alter table public.consent_records enable row level security;
alter table public.notification_outbox enable row level security;

-- Sólo lectura para personal; toda escritura pasa por las funciones anteriores.
grant select on public.appointments, public.appointment_events, public.notification_outbox,
  public.consent_records, public.appointment_resource_claims to authenticated;

create policy appointments_read on public.appointments for select to authenticated
  using (private.can_read_all_appointments()
         or (private.is_staff_mfa(array['professional']::public.staff_role[]) and doctor_id = private.current_doctor_id()));

create policy appointment_events_read on public.appointment_events for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id));

create policy resource_claims_read on public.appointment_resource_claims for select to authenticated
  using (private.can_read_all_appointments());

create policy consent_read on public.consent_records for select to authenticated
  using (private.can_read_all_appointments());

create policy outbox_read on public.notification_outbox for select to authenticated
  using (private.can_read_all_appointments());

-- Profesional: sólo los contactos de su propia agenda.
create policy contacts_read_professional on public.contacts for select to authenticated
  using (private.is_staff_mfa(array['professional']::public.staff_role[])
         and exists (select 1 from public.appointments a
                     where a.contact_id = contacts.id and a.doctor_id = private.current_doctor_id()));

-- ---------------------------------------------------------------------------
-- EXECUTE: público de reserva/outbox/jobs sólo para service_role; API de personal para authenticated.
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.booking_slots(uuid, uuid, date, date)',
    'public.booking_session_create(text)',
    'public.booking_session_state(text)',
    'public.booking_create_hold(text, uuid, uuid, timestamptz)',
    'public.booking_release_hold(text, uuid)',
    'public.booking_start_verification(text, text, text, text, text)',
    'public.booking_verify_code(text, text)',
    'public.booking_confirm(text, uuid, uuid, text, boolean)',
    'public.booking_result(text, uuid)',
    'public.manage_issue_token(uuid, uuid, text)',
    'public.manage_redeem(text, text)',
    'public.manage_session_from_booking(text, text)',
    'public.manage_overview(text)',
    'public.manage_cancel(text, uuid)',
    'public.manage_reschedule(text, uuid, uuid, timestamptz)',
    'public.manage_logout(text)',
    'public.manage_request_link(text)',
    'public.outbox_claim(text, integer, integer)',
    'public.outbox_context(uuid)',
    'public.outbox_complete(uuid, text, text, text, text)',
    'public.jobs_maintenance()',
    'public.rate_limit_hit(text, text, integer, integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;

  foreach f in array array[
    'public.staff_slots(uuid, uuid, date, date)',
    'public.staff_create_appointment(uuid, uuid, timestamptz, text, text, text, public.appointment_origin, boolean, boolean, text)',
    'public.staff_transition_appointment(uuid, public.appointment_status, text, boolean)',
    'public.staff_reschedule_appointment(uuid, uuid, timestamptz, boolean)',
    'public.staff_update_appointment_note(uuid, text)',
    'public.staff_retry_notification(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, service_role', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
