-- =====================================================================
-- 1200 · Secreto del cron solo en Vault
-- La Edge Function process-email-outbox valida el token con esta función
-- (solo service_role), así el secreto no se copia a mano en ningún lado.
-- =====================================================================
create or replace function public.verify_cron_secret(p_token text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(p_token is not null and p_token <> '' and p_token = (
    select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1
  ), false)
$$;

revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
