-- =====================================================================
-- 1000 · Tareas programadas (pg_cron + pg_net)
--
-- Requisitos en Supabase (una sola vez):
--   1. Dashboard → Database → Extensions: habilitar pg_cron y pg_net.
--   2. SQL Editor: guardar en Vault la URL del proyecto y un secreto aleatorio
--        select vault.create_secret('https://<tu-proyecto>.supabase.co', 'project_url');
--        select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret');
--      La Edge Function valida ese secreto con public.verify_cron_secret().
--
-- Si las extensiones no están disponibles (por ejemplo, en pruebas locales
-- con Postgres puro) esta migración no hace nada y no falla.
-- =====================================================================

do $do$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron / pg_net no disponibles: se omiten las tareas programadas';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;

  -- Recordatorios: cada 15 minutos
  perform cron.schedule('enqueue-appointment-reminders', '*/15 * * * *',
    $job$ select public.enqueue_appointment_reminders(); $job$);

  -- Correos atascados en "enviando": cada 30 minutos
  perform cron.schedule('release-stuck-emails', '*/30 * * * *',
    $job$ select public.release_stuck_emails(); $job$);

  -- Enviar la bandeja de salida: cada 2 minutos llama a la Edge Function
  perform cron.schedule('process-email-outbox', '*/2 * * * *',
    $job$
      select net.http_post(
        url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
                   || '/functions/v1/process-email-outbox',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
        body    := '{}'::jsonb,
        timeout_milliseconds := 20000
      )
      where exists (select 1 from public.email_outbox where status = 'pending' and scheduled_for <= now())
        and exists (select 1 from vault.decrypted_secrets where name = 'project_url');
    $job$);
end
$do$;
