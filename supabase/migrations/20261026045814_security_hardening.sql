-- =====================================================================
-- 1100 · Endurecimiento según Supabase Advisors
-- =====================================================================

-- 1. pg_net fuera del esquema public (sus funciones siguen en el esquema "net")
do $do$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
             where e.extname = 'pg_net' and n.nspname = 'public') then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end
$do$;

-- 2. Las funciones de trigger no deben poder llamarse por la API (/rest/v1/rpc/...)
revoke execute on function public.after_appointment_write()   from public, anon, authenticated;
revoke execute on function public.after_barber_write()        from public, anon, authenticated;
revoke execute on function public.after_sale_item()           from public, anon, authenticated;
revoke execute on function public.apply_inventory_movement()  from public, anon, authenticated;
revoke execute on function public.audit_row()                 from public, anon, authenticated;
revoke execute on function public.before_sale_item()          from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.handle_user_email_change()  from public, anon, authenticated;
revoke execute on function public.sync_profile_to_customer()  from public, anon, authenticated;
revoke execute on function public.validate_appointment()      from public, anon, authenticated;
revoke execute on function public.validate_barber()           from public, anon, authenticated;
revoke execute on function public.before_inventory_movement() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns()   from public, anon, authenticated;
revoke execute on function public.protect_customer_columns()  from public, anon, authenticated;
revoke execute on function public.set_updated_at()            from public, anon, authenticated;

-- 3. Funciones de identidad: las usan las políticas RLS, por eso deben poder ejecutarse.
--    Solo devuelven datos de quien consulta. Las que no usan las políticas de anon se le retiran.
revoke execute on function public.app_current_role()       from public, anon;
revoke execute on function public.current_branch_id()      from public, anon;
revoke execute on function public.current_barber_id()      from public, anon;
revoke execute on function public.current_customer_id()    from public, anon;
revoke execute on function public.can_manage_branch(uuid)  from public, anon;
revoke execute on function public.is_front_desk()          from public, anon;
grant execute on function public.app_current_role(), public.current_branch_id(), public.current_barber_id(),
                          public.current_customer_id(), public.can_manage_branch(uuid), public.is_front_desk()
  to authenticated;
