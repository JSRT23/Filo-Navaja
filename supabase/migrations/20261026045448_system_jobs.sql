-- =====================================================================
-- 0800 · Procesos del sistema: recordatorios, bandeja de correos y
-- derecho de supresión de datos (Ley 1581 de 2012)
-- =====================================================================

-- Encola recordatorios de citas que empiezan en las próximas N horas.
-- Lo ejecuta pg_cron cada 15 minutos (migración 1000).
create or replace function public.enqueue_appointment_reminders()
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_hours interval := make_interval(hours => public.setting_int('reminder_hours_before', 24));
  v_count integer := 0;
  v_id    uuid;
begin
  for v_id in
    select a.id from public.appointments a
    where a.status = 'confirmed'
      and a.reminder_queued_at is null
      and a.starts_at > now() + interval '1 hour'
      and a.starts_at <= now() + v_hours
    for update skip locked
  loop
    perform public.enqueue_appointment_email(v_id, 'booking_reminder');
    update public.appointments set reminder_queued_at = now() where id = v_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- La Edge Function toma un lote de correos pendientes de forma segura
-- (skip locked permite varias ejecuciones simultáneas sin duplicar envíos)
create or replace function public.claim_email_batch(p_limit integer default 20)
returns setof public.email_outbox
language sql volatile security definer set search_path = ''
as $$
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1
   where o.id in (
     select id from public.email_outbox
     where status = 'pending' and scheduled_for <= now()
     order by scheduled_for
     limit greatest(1, least(p_limit, 100))
     for update skip locked
   )
  returning o.*
$$;

-- Resultado del envío. Si falla, reintenta hasta 3 veces con espera creciente.
create or replace function public.complete_email(
  p_id uuid, p_success boolean, p_error text default null, p_provider_message_id text default null
)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_success then
    update public.email_outbox
       set status = 'sent', sent_at = now(), last_error = null, provider_message_id = p_provider_message_id
     where id = p_id;
  else
    update public.email_outbox
       set status        = case when attempts >= 3 then 'failed'::public.email_status else 'pending'::public.email_status end,
           last_error    = left(p_error, 1000),
           scheduled_for = now() + make_interval(mins => 10 * attempts)
     where id = p_id;
  end if;
end $$;

-- Devuelve a "pendiente" correos que quedaron en "enviando" por una caída
create or replace function public.release_stuck_emails()
returns integer
language sql volatile security definer set search_path = ''
as $$
  with r as (
    update public.email_outbox set status = 'pending'
    where status = 'sending' and scheduled_for < now() - interval '15 minutes'
    returning 1
  ) select count(*)::integer from r
$$;

-- Supresión de datos: se borran los datos personales pero se conservan
-- las ventas (obligación contable) asociadas a un cliente anónimo.
create or replace function public.anonymize_customer(p_customer_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare v_customer public.customers%rowtype;
begin
  select * into v_customer from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Cliente no encontrado' using errcode = 'P0002';
  end if;
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.appointments
     set status = 'cancelled', cancellation_reason = 'Datos del cliente suprimidos a solicitud del titular'
   where customer_id = p_customer_id and status in ('pending', 'confirmed') and starts_at > now();

  delete from public.email_outbox where to_email = v_customer.email and status in ('pending', 'failed');

  update public.customers
     set full_name = 'Cliente anónimo', phone = null, email = null, birth_date = null, notes = null,
         marketing_opt_in = false, is_anonymized = true, profile_id = null
   where id = p_customer_id;
end $$;

-- Solo el sistema (service_role / cron) ejecuta estas funciones
revoke execute on function public.enqueue_appointment_reminders() from public, anon, authenticated;
revoke execute on function public.claim_email_batch(integer) from public, anon, authenticated;
revoke execute on function public.complete_email(uuid, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.release_stuck_emails() from public, anon, authenticated;
revoke execute on function public.anonymize_customer(uuid) from public, anon;

grant execute on function public.enqueue_appointment_reminders() to service_role;
grant execute on function public.claim_email_batch(integer) to service_role;
grant execute on function public.complete_email(uuid, boolean, text, text) to service_role;
grant execute on function public.release_stuck_emails() to service_role;
grant execute on function public.anonymize_customer(uuid) to authenticated, service_role;
