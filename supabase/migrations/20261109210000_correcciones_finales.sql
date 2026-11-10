-- =====================================================================
-- 1400 · Correcciones de la revisión final
--  1. Anular una venta ya no bloquea volver a cobrar la cita
--  2. Recepción solo edita las notas internas de una cita (no estado, precio ni hora)
--  3. Un cliente no puede tener dos citas a la misma hora ni exceder el máximo por carrera
--  4. El historial de mostrador solo se enlaza con un correo confirmado
--  5. La supresión de datos borra también correos enviados, notas y auditoría
--  6. Las reglas del negocio (app_settings) tienen límites
--  7. La asistencia solo se marca desde la sede (kiosco), no desde cualquier celular
--  8. Recepción no agenda en el pasado, en cierres, fuera de horario ni en ausencias
--  9. El reporte de asistencia no cuenta ausente al barbero antes de que empiece su turno
-- 10. Los correos "en envío" se liberan según cuándo se reclamaron, no cuándo se programaron
-- 11. Las fotos de perfil ya no se pueden listar públicamente
-- 12. Las quincenas se cierran completas y en orden
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Una cita puede tener varias ventas anuladas, pero solo una vigente
-- ---------------------------------------------------------------------
alter table public.sales drop constraint if exists sales_appointment_id_key;
create unique index if not exists sales_appointment_completed_uidx
  on public.sales (appointment_id)
  where appointment_id is not null and status = 'completed';

-- ---------------------------------------------------------------------
-- 2. Recepción edita únicamente las notas internas por la API directa.
--    Estado, hora, precio y cliente cambian solo con las funciones RPC.
-- ---------------------------------------------------------------------
revoke update on public.appointments from authenticated, anon;
grant update (internal_notes) on public.appointments to authenticated;

-- ---------------------------------------------------------------------
-- 3. Un cliente no puede estar en dos citas a la vez
-- ---------------------------------------------------------------------
alter table public.appointments
  add constraint appointments_customer_no_overlap exclude using gist (
    customer_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'in_progress'));

create or replace function public.book_appointment(
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_notes text default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_customer   public.customers%rowtype;
  v_barber     public.barbers%rowtype;
  v_service    public.services%rowtype;
  v_max        integer := public.setting_int('max_active_bookings_per_customer', 3);
  v_active     integer;
  v_id         uuid;
  v_constraint text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para reservar' using errcode = '28000';
  end if;

  select * into v_customer from public.customers where profile_id = auth.uid();
  if not found then
    raise exception 'Tu cuenta no tiene ficha de cliente' using errcode = 'P0001';
  end if;
  if v_customer.data_consent_at is null then
    raise exception 'Debes aceptar la política de tratamiento de datos para reservar' using errcode = 'P0001';
  end if;

  select * into v_barber from public.barbers where id = p_barber_id;
  if not found or not v_barber.is_active or not v_barber.accepts_online_booking then
    raise exception 'Este barbero no recibe reservas en línea' using errcode = 'P0001';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'Ese servicio no está disponible' using errcode = 'P0001';
  end if;

  -- Dos reservas simultáneas del mismo cliente no pueden saltarse el máximo
  perform pg_advisory_xact_lock(hashtextextended(v_customer.id::text, 0));

  select count(*) into v_active
  from public.appointments
  where customer_id = v_customer.id and status in ('pending', 'confirmed') and starts_at > now();
  if v_active >= v_max then
    raise exception 'Ya tienes % citas activas. Cancela una para reservar otra', v_max using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.get_available_slots(p_barber_id, p_service_id, (p_starts_at at time zone public.app_timezone())::date) s
    where s.slot_start = p_starts_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elige otro' using errcode = 'P0001';
  end if;

  insert into public.appointments
    (branch_id, barber_id, customer_id, service_id, starts_at, ends_at, status, source, price, customer_notes, created_by)
  values
    (v_barber.branch_id, p_barber_id, v_customer.id, p_service_id, p_starts_at,
     p_starts_at + make_interval(mins => v_service.duration_minutes),
     'confirmed', 'online', v_service.price, nullif(btrim(p_customer_notes), ''), auth.uid())
  returning id into v_id;

  return v_id;
exception
  when exclusion_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'appointments_customer_no_overlap' then
      raise exception 'Ya tienes otra cita en ese horario. Elige otra hora' using errcode = 'P0001';
    end if;
    raise exception 'Ese horario acaba de ser reservado por otra persona. Elige otro' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- 8. Validación de agenda para el personal: no se agenda en el pasado,
--    en un cierre, fuera del horario de la sede o del barbero, en su
--    descanso ni durante una ausencia registrada.
-- ---------------------------------------------------------------------
create or replace function public.staff_slot_problem(p_barber_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz      text := public.app_timezone();
  v_date    date := (p_starts_at at time zone v_tz)::date;
  v_dow     smallint := extract(dow from (p_starts_at at time zone v_tz))::smallint;
  v_l_start time := (p_starts_at at time zone v_tz)::time;
  v_l_end   time := (p_ends_at at time zone v_tz)::time;
  v_branch  uuid;
  v_hours   public.branch_hours%rowtype;
  v_sched   public.barber_schedules%rowtype;
begin
  if p_starts_at < now() - interval '5 minutes' then
    return 'Esa hora ya pasó';
  end if;
  if (p_ends_at at time zone v_tz)::date <> v_date then
    return 'La cita no puede cruzar la medianoche';
  end if;

  select branch_id into v_branch from public.barbers where id = p_barber_id;

  if exists (select 1 from public.branch_closures c
             where c.closed_on = v_date and (c.branch_id is null or c.branch_id = v_branch)) then
    return 'La sede está cerrada ese día';
  end if;

  select * into v_hours from public.branch_hours where branch_id = v_branch and weekday = v_dow;
  if not found or v_hours.is_closed then
    return 'La sede no abre ese día';
  end if;
  if v_l_start < v_hours.opens_at or v_l_end > v_hours.closes_at then
    return format('Fuera del horario de la sede (%s a %s)', to_char(v_hours.opens_at, 'HH24:MI'), to_char(v_hours.closes_at, 'HH24:MI'));
  end if;

  select * into v_sched from public.barber_schedules where barber_id = p_barber_id and weekday = v_dow;
  if not found then
    return 'El barbero no trabaja ese día';
  end if;
  if v_l_start < v_sched.start_time or v_l_end > v_sched.end_time then
    return format('Fuera del horario del barbero (%s a %s)', to_char(v_sched.start_time, 'HH24:MI'), to_char(v_sched.end_time, 'HH24:MI'));
  end if;
  if v_sched.break_start is not null and v_l_start < v_sched.break_end and v_l_end > v_sched.break_start then
    return 'Cae en el descanso del barbero';
  end if;

  if exists (select 1 from public.barber_time_off t
             where t.barber_id = p_barber_id
               and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) then
    return 'El barbero tiene una ausencia registrada en ese horario';
  end if;
  return null;
end $$;

revoke execute on function public.staff_slot_problem(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.staff_create_appointment(
  p_customer_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_source public.appointment_source default 'reception',
  p_internal_notes text default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_barber     public.barbers%rowtype;
  v_service    public.services%rowtype;
  v_id         uuid;
  v_problem    text;
  v_constraint text;
begin
  select * into v_barber from public.barbers where id = p_barber_id and is_active;
  if not found then
    raise exception 'Barbero no encontrado o inactivo' using errcode = 'P0001';
  end if;
  if not (public.can_manage_branch(v_barber.branch_id) or public.is_trusted_context()) then
    raise exception 'No autorizado para agendar en esta sede' using errcode = '42501';
  end if;
  if p_source = 'online' then
    raise exception 'Las reservas en línea las crea el cliente' using errcode = '22023';
  end if;
  if p_starts_at is null then
    raise exception 'Indica la fecha y la hora de la cita' using errcode = '22023';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'Servicio no encontrado o inactivo' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.barber_services where barber_id = p_barber_id and service_id = p_service_id) then
    raise exception '% no presta el servicio "%"', v_barber.display_name, v_service.name using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers where id = p_customer_id and not is_anonymized) then
    raise exception 'Cliente no encontrado' using errcode = 'P0001';
  end if;

  if not public.is_trusted_context() then
    if p_source = 'walk_in' then
      -- Quien llega sin cita se registra con la hora de ahora (margen para registrarlo después)
      if p_starts_at > now() + interval '30 minutes' or p_starts_at < now() - interval '3 hours' then
        raise exception 'Quien llega sin cita se registra con la hora actual' using errcode = '22023';
      end if;
    else
      v_problem := public.staff_slot_problem(p_barber_id, p_starts_at, p_starts_at + make_interval(mins => v_service.duration_minutes));
      if v_problem is not null then
        raise exception '%', v_problem using errcode = 'P0001';
      end if;
    end if;
  end if;

  insert into public.appointments
    (branch_id, barber_id, customer_id, service_id, starts_at, ends_at, status, source, price, internal_notes, created_by)
  values
    (v_barber.branch_id, p_barber_id, p_customer_id, p_service_id, p_starts_at,
     p_starts_at + make_interval(mins => v_service.duration_minutes),
     case when p_source = 'walk_in' then 'in_progress'::public.appointment_status else 'confirmed' end,
     p_source, v_service.price, p_internal_notes, auth.uid())
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'appointments_customer_no_overlap' then
      raise exception 'El cliente ya tiene otra cita en ese horario' using errcode = 'P0001';
    end if;
    raise exception '% ya tiene una cita en ese horario', v_barber.display_name using errcode = 'P0001';
end $$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_new_barber_id uuid default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_appt       public.appointments%rowtype;
  v_barber_id  uuid;
  v_barber     public.barbers%rowtype;
  v_duration   integer;
  v_is_staff   boolean;
  v_problem    text;
  v_constraint text;
  v_window     interval := make_interval(mins => public.setting_int('cancellation_window_minutes', 120));
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'Cita no encontrada' using errcode = 'P0002';
  end if;

  v_is_staff := public.can_manage_branch(v_appt.branch_id) or public.is_trusted_context();
  if not v_is_staff and v_appt.customer_id is distinct from public.current_customer_id() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Solo se pueden reprogramar citas pendientes o confirmadas' using errcode = 'P0001';
  end if;
  if p_new_starts_at is null then
    raise exception 'Indica la nueva fecha y hora' using errcode = '22023';
  end if;

  v_barber_id := coalesce(p_new_barber_id, v_appt.barber_id);
  select * into v_barber from public.barbers where id = v_barber_id and is_active;
  if not found or v_barber.branch_id <> v_appt.branch_id then
    raise exception 'El barbero debe estar activo y pertenecer a la misma sede' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.barber_services where barber_id = v_barber_id and service_id = v_appt.service_id) then
    raise exception 'Ese barbero no presta el servicio reservado' using errcode = 'P0001';
  end if;

  select duration_minutes into v_duration from public.services where id = v_appt.service_id;

  if not v_is_staff then
    if not v_barber.accepts_online_booking then
      raise exception 'Este barbero no recibe reservas en línea. Comunícate con la sede' using errcode = 'P0001';
    end if;
    if now() > v_appt.starts_at - v_window then
      raise exception 'Solo puedes reprogramar hasta % minutos antes de la cita. Comunícate con la sede',
        extract(epoch from v_window)::integer / 60 using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.get_available_slots(v_barber_id, v_appt.service_id,
                     (p_new_starts_at at time zone public.app_timezone())::date, v_appt.id) s
      where s.slot_start = p_new_starts_at
    ) then
      raise exception 'Ese horario no está disponible' using errcode = 'P0001';
    end if;
  elsif not public.is_trusted_context() then
    v_problem := public.staff_slot_problem(v_barber_id, p_new_starts_at, p_new_starts_at + make_interval(mins => v_duration));
    if v_problem is not null then
      raise exception '%', v_problem using errcode = 'P0001';
    end if;
  end if;

  update public.appointments
     set starts_at = p_new_starts_at,
         ends_at   = p_new_starts_at + make_interval(mins => v_duration),
         barber_id = v_barber_id
   where id = v_appt.id;

  return v_appt.id;
exception
  when exclusion_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'appointments_customer_no_overlap' then
      raise exception 'El cliente ya tiene otra cita en ese horario' using errcode = 'P0001';
    end if;
    raise exception 'Ese horario ya está ocupado' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- 4. El historial de mostrador se enlaza solo con un correo confirmado
-- ---------------------------------------------------------------------
create or replace function public.link_counter_customer(p_user_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_own public.customers%rowtype;
  v_old uuid;
begin
  select * into v_own from public.customers where profile_id = p_user_id and not is_anonymized;
  if not found or v_own.email is null then return; end if;

  select c.id into v_old
  from public.customers c
  where c.profile_id is null and not c.is_anonymized and c.id <> v_own.id and c.email = v_own.email
  order by c.created_at
  limit 1;
  if v_old is null then return; end if;

  -- El historial del cliente de mostrador pasa a la cuenta; la ficha vacía recién creada se descarta
  update public.appointments set customer_id = v_old where customer_id = v_own.id;
  update public.sales        set customer_id = v_old where customer_id = v_own.id;
  delete from public.customers where id = v_own.id;
  update public.customers
     set profile_id           = p_user_id,
         full_name            = v_own.full_name,
         phone                = coalesce(v_own.phone, phone),
         data_consent_at      = coalesce(v_own.data_consent_at, data_consent_at),
         data_consent_version = coalesce(v_own.data_consent_version, data_consent_version)
   where id = v_old;
end $$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.link_counter_customer(new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_app      jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_role     public.app_role := 'client';
  v_branch   uuid;
  v_name     text := coalesce(nullif(btrim(v_meta ->> 'full_name'), ''), split_part(new.email, '@', 1));
  v_phone    text := nullif(regexp_replace(coalesce(v_meta ->> 'phone', ''), '\D', '', 'g'), '');
  v_consent  boolean := coalesce(v_meta ->> 'data_consent', 'false') = 'true';
  v_version  text := (select value #>> '{}' from public.app_settings where key = 'privacy_policy_version');
  v_customer uuid;
begin
  if v_app ->> 'role' in ('admin', 'receptionist', 'barber') then
    v_role   := (v_app ->> 'role')::public.app_role;
    v_branch := nullif(v_app ->> 'branch_id', '')::uuid;
  end if;

  insert into public.profiles (id, full_name, email, phone, role, branch_id)
  values (new.id, v_name, new.email, v_phone, v_role, v_branch);

  if v_role = 'client' then
    -- Solo se hereda el historial de mostrador si el correo ya está confirmado.
    -- Si no, se enlaza al confirmarlo (handle_user_confirmed).
    if new.email_confirmed_at is not null then
      select c.id into v_customer
      from public.customers c
      where c.profile_id is null and not c.is_anonymized and c.email = new.email::extensions.citext
      order by c.created_at
      limit 1;
    end if;

    if v_customer is not null then
      update public.customers
         set profile_id           = new.id,
             full_name            = v_name,
             phone                = coalesce(v_phone, phone),
             data_consent_at      = case when v_consent then now() else data_consent_at end,
             data_consent_version = case when v_consent then v_version else data_consent_version end
       where id = v_customer;
    else
      insert into public.customers (profile_id, full_name, email, phone, data_consent_at, data_consent_version)
      values (new.id, v_name, new.email, v_phone,
              case when v_consent then now() end,
              case when v_consent then v_version end);
    end if;
  end if;

  return new;
end $$;

revoke execute on function public.link_counter_customer(uuid) from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
grant  execute on function public.link_counter_customer(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 5. Supresión de datos: nada de datos personales queda en correos,
--    notas de citas, perfil ni auditoría (Ley 1581 de 2012)
-- ---------------------------------------------------------------------
create or replace function public.anonymize_customer(p_customer_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
  v_profile  uuid;
begin
  select * into v_customer from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Cliente no encontrado' using errcode = 'P0002';
  end if;
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  v_profile := v_customer.profile_id;

  update public.appointments
     set status = 'cancelled', cancellation_reason = 'Datos del cliente suprimidos a solicitud del titular'
   where customer_id = p_customer_id and status in ('pending', 'confirmed') and starts_at > now();

  -- Notas escritas por o sobre el cliente
  update public.appointments
     set customer_notes = null, internal_notes = null
   where customer_id = p_customer_id and (customer_notes is not null or internal_notes is not null);

  -- Correos: ninguno conserva su dirección, su nombre ni el contenido
  if v_customer.email is not null then
    delete from public.email_outbox where to_email = v_customer.email;
  end if;
  delete from public.email_outbox
   where appointment_id in (select id from public.appointments where customer_id = p_customer_id);

  update public.customers
     set full_name = 'Cliente anónimo', phone = null, email = null, birth_date = null, notes = null,
         marketing_opt_in = false, is_anonymized = true, profile_id = null
   where id = p_customer_id;

  if v_profile is not null then
    update public.profiles
       set full_name = 'Cliente anónimo', phone = null, email = null, avatar_url = null
     where id = v_profile and role = 'client';
  end if;

  -- Auditoría: se conserva el rastro (quién, cuándo, qué tabla) sin datos personales
  update public.audit_log
     set old_data = old_data - 'full_name' - 'email' - 'phone' - 'avatar_url' - 'customer_notes' - 'internal_notes' - 'birth_date' - 'notes',
         new_data = new_data - 'full_name' - 'email' - 'phone' - 'avatar_url' - 'customer_notes' - 'internal_notes' - 'birth_date' - 'notes'
   where (table_name = 'profiles' and record_id = v_profile)
      or (table_name = 'appointments'
          and record_id in (select id from public.appointments where customer_id = p_customer_id));
end $$;

-- ---------------------------------------------------------------------
-- 6. Las reglas del negocio solo aceptan valores razonables
-- ---------------------------------------------------------------------
create or replace function public.validate_app_setting()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_bounds jsonb := '{
    "slot_interval_minutes":            [5, 60],
    "min_booking_lead_minutes":         [0, 1440],
    "max_booking_days_ahead":           [1, 365],
    "cancellation_window_minutes":      [0, 10080],
    "reminder_hours_before":            [2, 168],
    "max_active_bookings_per_customer": [1, 20],
    "late_tolerance_minutes":           [0, 120],
    "default_service_commission_rate":  [0, 100],
    "default_product_commission_rate":  [0, 100],
    "pin_max_attempts":                 [3, 10],
    "pin_lock_minutes":                 [1, 1440],
    "max_discount_percent_receptionist":[0, 100]
  }';
  v_range  jsonb := v_bounds -> new.key;
  v_num    numeric;
begin
  if v_range is not null then
    if jsonb_typeof(new.value) <> 'number' then
      raise exception 'La regla "%" debe ser un número', new.key using errcode = '22023';
    end if;
    v_num := (new.value #>> '{}')::numeric;
    if v_num <> trunc(v_num) or v_num < (v_range ->> 0)::numeric or v_num > (v_range ->> 1)::numeric then
      raise exception 'La regla "%" debe ser un entero entre % y %', new.key, v_range ->> 0, v_range ->> 1
        using errcode = '22023';
    end if;
  elsif new.key = 'timezone' then
    if jsonb_typeof(new.value) <> 'string' or not exists (select 1 from pg_catalog.pg_timezone_names where name = new.value #>> '{}') then
      raise exception 'Zona horaria inválida' using errcode = '22023';
    end if;
  elsif new.key = 'privacy_policy_version' then
    if jsonb_typeof(new.value) <> 'string' or btrim(new.value #>> '{}') = '' then
      raise exception 'La versión de la política no puede estar vacía' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists validate_app_setting on public.app_settings;
create trigger validate_app_setting
  before insert or update on public.app_settings
  for each row execute function public.validate_app_setting();
revoke execute on function public.validate_app_setting() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. La asistencia solo se marca desde un dispositivo de la sede
--    (recepción o administración), nunca con la sesión personal del barbero
-- ---------------------------------------------------------------------
create or replace function public.register_attendance(p_barber_id uuid, p_pin text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tz        text := public.app_timezone();
  v_now       timestamptz := now();
  v_day_start timestamptz := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_max       integer := public.setting_int('pin_max_attempts', 5);
  v_lock      interval := make_interval(mins => public.setting_int('pin_lock_minutes', 15));
  v_tol       interval := make_interval(mins => public.setting_int('late_tolerance_minutes', 10));
  v_barber    public.barbers%rowtype;
  v_cred      public.barber_credentials%rowtype;
  v_last      public.attendance_logs%rowtype;
  v_type      public.attendance_type;
  v_start     time;
  v_late      boolean := false;
  v_id        uuid;
begin
  select * into v_barber from public.barbers where id = p_barber_id and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Barbero no encontrado');
  end if;
  if not (public.can_manage_branch(v_barber.branch_id) or public.is_trusted_context()) then
    raise exception 'Este dispositivo no está autorizado para registrar asistencia en la sede' using errcode = '42501';
  end if;

  select * into v_cred from public.barber_credentials where barber_id = p_barber_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No tienes PIN asignado. Pídelo en administración');
  end if;
  if v_cred.locked_until is not null and v_cred.locked_until > v_now then
    return jsonb_build_object('ok', false,
      'error', 'PIN bloqueado por intentos fallidos. Intenta de nuevo a las ' || to_char(v_cred.locked_until at time zone v_tz, 'HH12:MI AM'),
      'locked_until', v_cred.locked_until);
  end if;

  if p_pin is null or extensions.crypt(p_pin, v_cred.pin_hash) <> v_cred.pin_hash then
    update public.barber_credentials
       set failed_attempts = failed_attempts + 1,
           locked_until    = case when failed_attempts + 1 >= v_max then v_now + v_lock end
     where barber_id = p_barber_id;
    return jsonb_build_object('ok', false, 'error', 'PIN incorrecto',
                              'attempts_left', greatest(v_max - (v_cred.failed_attempts + 1), 0));
  end if;

  update public.barber_credentials set failed_attempts = 0, locked_until = null where barber_id = p_barber_id;

  select * into v_last from public.attendance_logs
  where barber_id = p_barber_id and recorded_at >= v_day_start
  order by recorded_at desc limit 1;

  if found and v_now - v_last.recorded_at < interval '1 minute' then
    return jsonb_build_object('ok', false,
      'error', case v_last.type when 'check_in' then 'Ya registraste tu entrada hace un momento'
                                else 'Ya registraste tu salida hace un momento' end);
  end if;

  v_type := case when found and v_last.type = 'check_in' then 'check_out' else 'check_in' end;

  if v_type = 'check_in' and not exists (select 1 from public.attendance_logs
                                         where barber_id = p_barber_id and recorded_at >= v_day_start and type = 'check_in') then
    select start_time into v_start from public.barber_schedules
    where barber_id = p_barber_id and weekday = extract(dow from v_now at time zone v_tz)::smallint;
    v_late := v_start is not null and (v_now at time zone v_tz)::time > v_start + v_tol;
  end if;

  insert into public.attendance_logs (barber_id, branch_id, type, recorded_at, source, recorded_by)
  values (p_barber_id, v_barber.branch_id, v_type, v_now, 'kiosk', auth.uid())
  returning id into v_id;

  return jsonb_build_object(
    'ok', true, 'attendance_id', v_id, 'type', v_type, 'recorded_at', v_now,
    'barber_name', v_barber.display_name, 'is_late', v_late);
end $$;

-- ---------------------------------------------------------------------
-- 9. Reporte de asistencia: hoy solo cuenta como ausencia pasada la
--    hora de entrada más la tolerancia
-- ---------------------------------------------------------------------
create or replace function public.attendance_report(p_from date, p_to date, p_branch_id uuid default null)
returns table (
  barber_id uuid, barber_name text, branch_name text,
  scheduled_days integer, worked_days integer, absences integer, late_arrivals integer, worked_minutes integer
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz       text := public.app_timezone();
  v_today    date := (now() at time zone v_tz)::date;
  v_now_time time := (now() at time zone v_tz)::time;
  v_tol      interval := make_interval(mins => public.setting_int('late_tolerance_minutes', 10));
  v_branch   uuid := p_branch_id;
  v_barber   uuid;
begin
  if public.is_admin() or public.is_trusted_context() then
    null;
  elsif public.app_current_role() = 'receptionist' then
    v_branch := public.current_branch_id();
  elsif public.current_barber_id() is not null then
    v_barber := public.current_barber_id();
  else
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 92 then
    raise exception 'Rango de fechas inválido (máximo 92 días)' using errcode = '22023';
  end if;

  return query
  with bar as (
    select b.id, b.display_name, b.branch_id, br.name as branch_name
    from public.barbers b join public.branches br on br.id = b.branch_id
    where b.is_active
      and (v_branch is null or b.branch_id = v_branch)
      and (v_barber is null or b.id = v_barber)
  ),
  days as (
    select g::date as day from generate_series(p_from, least(p_to, v_today), interval '1 day') g
  ),
  scheduled as (
    select bar.id as barber_id, d.day, s.start_time
    from bar
    cross join days d
    join public.barber_schedules s on s.barber_id = bar.id and s.weekday = extract(dow from d.day)::smallint
    where (d.day < v_today or v_now_time > s.start_time + v_tol)
      and not exists (select 1 from public.branch_closures c
                      where c.closed_on = d.day and (c.branch_id is null or c.branch_id = bar.branch_id))
      and not exists (select 1 from public.barber_time_off t
                      where t.barber_id = bar.id
                        and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(d.day::timestamp at time zone v_tz, (d.day + 1)::timestamp at time zone v_tz, '[)'))
  ),
  logs as (
    select a.barber_id, (a.recorded_at at time zone v_tz)::date as day, a.type, a.recorded_at,
           lead(a.type)        over w as next_type,
           lead(a.recorded_at) over w as next_at
    from public.attendance_logs a
    where a.barber_id in (select id from bar)
      and a.recorded_at >= p_from::timestamp at time zone v_tz
      and a.recorded_at <  (p_to + 1)::timestamp at time zone v_tz
    window w as (partition by a.barber_id, (a.recorded_at at time zone v_tz)::date order by a.recorded_at)
  ),
  daily as (
    select l.barber_id, l.day,
           min(l.recorded_at) filter (where l.type = 'check_in') as first_in,
           coalesce(sum(extract(epoch from (l.next_at - l.recorded_at)) / 60)
                    filter (where l.type = 'check_in' and l.next_type = 'check_out'), 0) as minutes
    from logs l
    group by l.barber_id, l.day
  )
  select bar.id, bar.display_name, bar.branch_name,
         (select count(*) from scheduled s where s.barber_id = bar.id)::integer,
         (select count(*) from daily dl where dl.barber_id = bar.id and dl.first_in is not null)::integer,
         (select count(*) from scheduled s
          where s.barber_id = bar.id
            and not exists (select 1 from daily dl where dl.barber_id = s.barber_id and dl.day = s.day and dl.first_in is not null))::integer,
         (select count(*) from scheduled s
          join daily dl on dl.barber_id = s.barber_id and dl.day = s.day
          where s.barber_id = bar.id and (dl.first_in at time zone v_tz)::time > s.start_time + v_tol)::integer,
         (select coalesce(sum(dl.minutes), 0) from daily dl where dl.barber_id = bar.id)::integer
  from bar
  order by bar.branch_name, bar.display_name;
end $$;

-- ---------------------------------------------------------------------
-- 10. Correos: se libera un envío atascado según cuándo se reclamó
-- ---------------------------------------------------------------------
alter table public.email_outbox add column if not exists claimed_at timestamptz;

create or replace function public.claim_email_batch(p_limit integer default 20)
returns setof public.email_outbox
language sql volatile security definer set search_path = ''
as $$
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1, claimed_at = now()
   where o.id in (
     select id from public.email_outbox
     where status = 'pending' and scheduled_for <= now()
     order by scheduled_for
     limit greatest(1, least(p_limit, 100))
     for update skip locked
   )
  returning o.*
$$;

create or replace function public.release_stuck_emails()
returns integer
language sql volatile security definer set search_path = ''
as $$
  with r as (
    update public.email_outbox set status = 'pending', claimed_at = null
    where status = 'sending' and coalesce(claimed_at, scheduled_for) < now() - interval '15 minutes'
    returning 1
  ) select count(*)::integer from r
$$;

-- ---------------------------------------------------------------------
-- 11. Fotos: barberos y catálogo son públicas; el avatar solo lo lista su dueño
--     (la URL pública de una imagen sigue funcionando sin permisos de listado)
-- ---------------------------------------------------------------------
drop policy if exists "storage: lectura pública de imágenes" on storage.objects;

create policy "storage: lectura pública de fotos de barberos y catálogo"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('barbers', 'catalog'));

create policy "storage: el usuario lee su avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 12. Las quincenas se cierran completas y en orden
-- ---------------------------------------------------------------------
create or replace function public.close_commission_period(p_starts_on date, p_ends_on date)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id    uuid;
  v_fs    date;
  v_fe    date;
  v_last  date;
begin
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'Solo un administrador puede cerrar periodos' using errcode = '42501';
  end if;
  if p_starts_on is null or p_ends_on is null then
    raise exception 'Indica el inicio y el fin de la quincena' using errcode = '22023';
  end if;

  select f.starts_on, f.ends_on into v_fs, v_fe from public.get_fortnight(p_starts_on) f;
  if p_starts_on <> v_fs or p_ends_on <> v_fe then
    raise exception 'El periodo debe ser una quincena completa (del 1 al 15 o del 16 al fin de mes)' using errcode = '22023';
  end if;
  if p_ends_on >= (now() at time zone public.app_timezone())::date then
    raise exception 'Solo se puede cerrar un periodo que ya terminó' using errcode = 'P0001';
  end if;

  select max(ends_on) into v_last from public.commission_periods;
  if v_last is not null and p_starts_on > v_last + 1 then
    raise exception 'Hay quincenas sin cerrar. Cierra primero la que empieza el %', to_char(v_last + 1, 'DD/MM/YYYY')
      using errcode = 'P0001';
  end if;

  insert into public.commission_periods (starts_on, ends_on, closed_by)
  values (p_starts_on, p_ends_on, auth.uid())
  returning id into v_id;

  insert into public.commission_statements
    (period_id, barber_id, services_count, services_revenue, products_count, products_revenue,
     service_commission, product_commission, total_commission)
  select v_id, c.barber_id, c.services_count, c.services_revenue, c.products_count, c.products_revenue,
         c.service_commission, c.product_commission, c.total_commission
  from public.commission_summary(p_starts_on, p_ends_on) c;

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Ese rango se cruza con un periodo ya cerrado' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- 13. El inventario real (cantidades) solo lo ve el personal. El público
--     ve únicamente si hay producto en cada sede.
-- ---------------------------------------------------------------------
drop policy if exists "stock: lectura pública (disponible / agotado)" on public.product_stock;
do $$
declare v_pol text;
begin
  for v_pol in select policyname from pg_policies
               where schemaname = 'public' and tablename = 'product_stock' and cmd = 'SELECT'
                 and roles && array['anon']::name[]
  loop
    execute format('drop policy %I on public.product_stock', v_pol);
  end loop;
end $$;

create policy "product_stock: lectura del personal"
  on public.product_stock for select to authenticated
  using (public.app_current_role() in ('admin', 'receptionist', 'barber'));

create or replace view public.product_availability
with (security_invoker = false) as
  select product_id, branch_id, (quantity > 0) as in_stock
  from public.product_stock;
grant select on public.product_availability to anon, authenticated;
