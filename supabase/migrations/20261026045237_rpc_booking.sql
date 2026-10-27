-- =====================================================================
-- 0500 · Reservas: disponibilidad, reservar, reprogramar, cancelar
-- =====================================================================

-- ---------------------------------------------------------------------
-- Horarios libres de un barbero para un servicio en una fecha.
-- Respeta: horario del barbero, horario y cierres de la sede, descanso,
-- novedades, citas existentes, anticipación mínima y días máximos.
-- ---------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_barber_id uuid,
  p_service_id uuid,
  p_date date,
  p_ignore_appointment_id uuid default null
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz       text     := public.app_timezone();
  v_today    date     := (now() at time zone v_tz)::date;
  v_step     interval := make_interval(mins => public.setting_int('slot_interval_minutes', 15));
  v_lead     interval := make_interval(mins => public.setting_int('min_booking_lead_minutes', 60));
  v_max_days integer  := public.setting_int('max_booking_days_ahead', 30);
  v_dow      smallint := extract(dow from p_date)::smallint;
  v_branch   uuid;
  v_duration interval;
  v_sched    public.barber_schedules%rowtype;
  v_open     time;
  v_close    time;
  v_closed   boolean;
  v_from     time;
  v_to       time;
begin
  if p_date is null or p_date < v_today or p_date > v_today + v_max_days then
    return;
  end if;

  select b.branch_id into v_branch
  from public.barbers b
  join public.branches br on br.id = b.branch_id
  where b.id = p_barber_id and b.is_active and br.is_active;
  if v_branch is null then return; end if;

  select make_interval(mins => s.duration_minutes) into v_duration
  from public.services s
  join public.barber_services bs on bs.service_id = s.id and bs.barber_id = p_barber_id
  where s.id = p_service_id and s.is_active;
  if v_duration is null then return; end if;

  if exists (select 1 from public.branch_closures c
             where c.closed_on = p_date and (c.branch_id is null or c.branch_id = v_branch)) then
    return;
  end if;

  select * into v_sched from public.barber_schedules where barber_id = p_barber_id and weekday = v_dow;
  if not found then return; end if;

  select h.opens_at, h.closes_at, h.is_closed into v_open, v_close, v_closed
  from public.branch_hours h where h.branch_id = v_branch and h.weekday = v_dow;
  if coalesce(v_closed, false) then return; end if;

  v_from := greatest(v_sched.start_time, coalesce(v_open, v_sched.start_time));
  v_to   := least(v_sched.end_time, coalesce(v_close, v_sched.end_time));
  if v_from >= v_to or (p_date + v_to) - (p_date + v_from) < v_duration then return; end if;

  return query
  with candidates as (
    select (gs at time zone v_tz)                as s_start,
           ((gs + v_duration) at time zone v_tz) as s_end,
           gs::time                              as l_start,
           (gs + v_duration)::time               as l_end
    from generate_series(p_date + v_from, p_date + v_to - v_duration, v_step) as gs
  )
  select c.s_start, c.s_end
  from candidates c
  where c.s_start >= now() + v_lead
    and (v_sched.break_start is null
         or not (c.l_start < v_sched.break_end and c.l_end > v_sched.break_start))
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = p_barber_id
        and a.id is distinct from p_ignore_appointment_id
        and a.status in ('pending', 'confirmed', 'in_progress', 'completed')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.s_start, c.s_end, '[)'))
    and not exists (
      select 1 from public.barber_time_off t
      where t.barber_id = p_barber_id
        and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(c.s_start, c.s_end, '[)'))
  order by c.s_start;
end $$;

comment on function public.get_available_slots is 'Horarios libres de un barbero para un servicio en una fecha (hora de Colombia).';

-- Disponibilidad de todos los barberos de una sede para un servicio
create or replace function public.get_branch_availability(p_branch_id uuid, p_service_id uuid, p_date date)
returns table (barber_id uuid, barber_name text, photo_url text, slot_start timestamptz, slot_end timestamptz)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.display_name, b.photo_url, s.slot_start, s.slot_end
  from public.barbers b
  join public.barber_services bs on bs.barber_id = b.id and bs.service_id = p_service_id
  cross join lateral public.get_available_slots(b.id, p_service_id, p_date) s
  where b.branch_id = p_branch_id and b.is_active and b.accepts_online_booking
  order by s.slot_start, b.sort_order, b.display_name
$$;

-- Fechas con al menos un horario libre (para pintar el calendario)
create or replace function public.get_available_dates(p_service_id uuid, p_branch_id uuid, p_barber_id uuid default null, p_days integer default 14)
returns table (available_on date, slots_count integer)
language sql stable security definer set search_path = ''
as $$
  with days as (
    select ((now() at time zone public.app_timezone())::date + g) as d
    from generate_series(0, least(greatest(p_days, 1), public.setting_int('max_booking_days_ahead', 30))) g
  )
  select d.d, count(*)::integer
  from days d
  join public.barbers b on b.branch_id = p_branch_id and b.is_active and b.accepts_online_booking
                       and (p_barber_id is null or b.id = p_barber_id)
  cross join lateral public.get_available_slots(b.id, p_service_id, d.d) s
  group by d.d
  order by d.d
$$;

-- ---------------------------------------------------------------------
-- Reserva en línea del cliente autenticado
-- ---------------------------------------------------------------------
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
  v_customer public.customers%rowtype;
  v_barber   public.barbers%rowtype;
  v_service  public.services%rowtype;
  v_max      integer := public.setting_int('max_active_bookings_per_customer', 3);
  v_active   integer;
  v_id       uuid;
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

  select * into v_service from public.services where id = p_service_id;

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
    raise exception 'Ese horario acaba de ser reservado por otra persona. Elige otro' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- Recepción: buscar o registrar un cliente de mostrador
-- ---------------------------------------------------------------------
create or replace function public.staff_upsert_customer(
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_data_consent boolean default false,
  p_notes text default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_email extensions.citext := nullif(btrim(coalesce(p_email, '')), '')::extensions.citext;
  v_id    uuid;
begin
  if not (public.is_front_desk() or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then
    raise exception 'El nombre del cliente es obligatorio' using errcode = '22023';
  end if;

  select id into v_id
  from public.customers
  where not is_anonymized
    and ((v_phone is not null and phone = v_phone) or (v_email is not null and email = v_email))
  order by (profile_id is not null) desc, created_at
  limit 1;

  if v_id is null then
    insert into public.customers (full_name, phone, email, notes, data_consent_at, created_by)
    values (btrim(p_full_name), v_phone, v_email, p_notes,
            case when p_data_consent then now() end, auth.uid())
    returning id into v_id;
  else
    update public.customers
       set phone           = coalesce(phone, v_phone),
           email           = coalesce(email, v_email),
           notes           = coalesce(p_notes, notes),
           data_consent_at = coalesce(data_consent_at, case when p_data_consent then now() end)
     where id = v_id;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Recepción: crear cita (teléfono, WhatsApp o cliente que llega)
-- ---------------------------------------------------------------------
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
  v_barber  public.barbers%rowtype;
  v_service public.services%rowtype;
  v_id      uuid;
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
    raise exception '% ya tiene una cita en ese horario', v_barber.display_name using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- Reprogramar (cliente dentro de la ventana permitida, o recepción)
-- ---------------------------------------------------------------------
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_new_barber_id uuid default null
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_appt      public.appointments%rowtype;
  v_barber_id uuid;
  v_barber    public.barbers%rowtype;
  v_duration  integer;
  v_is_staff  boolean;
  v_window    interval := make_interval(mins => public.setting_int('cancellation_window_minutes', 120));
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

  v_barber_id := coalesce(p_new_barber_id, v_appt.barber_id);
  select * into v_barber from public.barbers where id = v_barber_id and is_active;
  if not found or v_barber.branch_id <> v_appt.branch_id then
    raise exception 'El barbero debe estar activo y pertenecer a la misma sede' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.barber_services where barber_id = v_barber_id and service_id = v_appt.service_id) then
    raise exception 'Ese barbero no presta el servicio reservado' using errcode = 'P0001';
  end if;

  if not v_is_staff then
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
  end if;

  select duration_minutes into v_duration from public.services where id = v_appt.service_id;

  update public.appointments
     set starts_at = p_new_starts_at,
         ends_at   = p_new_starts_at + make_interval(mins => v_duration),
         barber_id = v_barber_id
   where id = v_appt.id;

  return v_appt.id;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya está ocupado' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- Cancelar
-- ---------------------------------------------------------------------
create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_appt     public.appointments%rowtype;
  v_is_staff boolean;
  v_window   interval := make_interval(mins => public.setting_int('cancellation_window_minutes', 120));
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
    raise exception 'La cita ya no se puede cancelar (estado: %)', v_appt.status using errcode = 'P0001';
  end if;
  if not v_is_staff and now() > v_appt.starts_at - v_window then
    raise exception 'Solo puedes cancelar hasta % minutos antes de la cita. Comunícate con la sede',
      extract(epoch from v_window)::integer / 60 using errcode = 'P0001';
  end if;

  update public.appointments
     set status              = 'cancelled',
         cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         cancelled_by        = auth.uid()
   where id = v_appt.id;
end $$;

-- ---------------------------------------------------------------------
-- Cambiar el estado: confirmar, en silla, terminado, no asistió
-- ---------------------------------------------------------------------
create or replace function public.set_appointment_status(p_appointment_id uuid, p_status public.appointment_status)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_appt    public.appointments%rowtype;
  v_allowed public.appointment_status[];
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'Cita no encontrada' using errcode = 'P0002';
  end if;
  if not (public.can_manage_branch(v_appt.branch_id)
          or coalesce(v_appt.barber_id = public.current_barber_id(), false)
          or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_allowed := case v_appt.status
    when 'pending'     then array['confirmed', 'in_progress', 'no_show']::public.appointment_status[]
    when 'confirmed'   then array['in_progress', 'no_show']::public.appointment_status[]
    when 'in_progress' then array['completed']::public.appointment_status[]
    else array[]::public.appointment_status[]
  end;

  if p_status = 'cancelled' then
    raise exception 'Usa cancel_appointment para cancelar' using errcode = '22023';
  end if;
  if not (p_status = any (v_allowed)) then
    raise exception 'No se puede pasar de "%" a "%"', v_appt.status, p_status using errcode = 'P0001';
  end if;
  if p_status = 'no_show' and now() < v_appt.starts_at then
    raise exception 'Solo se marca "no asistió" después de la hora de la cita' using errcode = 'P0001';
  end if;

  update public.appointments set status = p_status where id = v_appt.id;
end $$;

-- ---------------------------------------------------------------------
-- Vista de citas con nombres (respeta la RLS de quien consulta)
-- ---------------------------------------------------------------------
create or replace view public.v_appointments
with (security_invoker = true) as
select
  a.id, a.branch_id, br.name as branch_name,
  a.barber_id, b.display_name as barber_name, b.photo_url as barber_photo_url, b.calendar_color,
  a.customer_id, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
  a.service_id, s.name as service_name, s.duration_minutes,
  a.starts_at, a.ends_at,
  (a.starts_at at time zone public.app_timezone())::date as local_date,
  to_char(a.starts_at at time zone public.app_timezone(), 'HH24:MI') as local_time,
  a.status, a.source, a.price, a.customer_notes, a.internal_notes,
  a.checked_in_at, a.completed_at, a.cancelled_at, a.cancellation_reason,
  a.created_at
from public.appointments a
join public.branches br on br.id = a.branch_id
join public.barbers b   on b.id = a.barber_id
join public.customers c on c.id = a.customer_id
join public.services s  on s.id = a.service_id;

-- Permisos de ejecución
revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text) from public, anon;
revoke execute on function public.staff_upsert_customer(text, text, text, boolean, text) from public, anon;
revoke execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, public.appointment_source, text) from public, anon;
revoke execute on function public.reschedule_appointment(uuid, timestamptz, uuid) from public, anon;
revoke execute on function public.cancel_appointment(uuid, text) from public, anon;
revoke execute on function public.set_appointment_status(uuid, public.appointment_status) from public, anon;

grant execute on function public.get_available_slots(uuid, uuid, date, uuid) to anon, authenticated;
grant execute on function public.get_branch_availability(uuid, uuid, date) to anon, authenticated;
grant execute on function public.get_available_dates(uuid, uuid, uuid, integer) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.staff_upsert_customer(text, text, text, boolean, text) to authenticated;
grant execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, public.appointment_source, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.set_appointment_status(uuid, public.appointment_status) to authenticated;
