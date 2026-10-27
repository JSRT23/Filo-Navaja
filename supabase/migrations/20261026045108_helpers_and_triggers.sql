-- =====================================================================
-- 0300 · Funciones auxiliares y triggers
-- Identidad y rol del usuario · Altas de usuarios · Protección de columnas
-- Inventario · Comisiones · Correos encolados · Auditoría
-- =====================================================================

-- ================================================ CONFIGURACIÓN ======
create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql stable security definer set search_path = ''
as $$ select coalesce((select (value #>> '{}')::integer from public.app_settings where key = p_key), p_default) $$;

create or replace function public.app_timezone()
returns text
language sql stable security definer set search_path = ''
as $$ select coalesce((select value #>> '{}' from public.app_settings where key = 'timezone'), 'America/Bogota') $$;

-- ===================================================== IDENTIDAD ======
-- Contexto de confianza: migraciones, SQL Editor, cron o service_role.
-- Las peticiones de la app (anon/authenticated) nunca son de confianza.
create or replace function public.is_trusted_context()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or coalesce(nullif(current_setting('role', true), ''), 'none') in ('none', 'postgres', 'service_role', 'supabase_admin')
$$;

create or replace function public.app_current_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id = auth.uid() and p.is_active $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.app_current_role() = 'admin', false) $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.app_current_role() in ('admin', 'receptionist', 'barber'), false) $$;

create or replace function public.is_front_desk()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.app_current_role() in ('admin', 'receptionist'), false) $$;

create or replace function public.current_branch_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select p.branch_id from public.profiles p where p.id = auth.uid() $$;

create or replace function public.current_barber_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select b.id from public.barbers b
  join public.profiles p on p.id = b.profile_id and p.is_active
  where b.profile_id = auth.uid()
$$;

create or replace function public.current_customer_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select c.id from public.customers c where c.profile_id = auth.uid() $$;

-- Admin: todas las sedes · Recepción: solo su sede
create or replace function public.can_manage_branch(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or coalesce(public.app_current_role() = 'receptionist' and public.current_branch_id() = p_branch_id, false)
$$;

-- Lectura de una regla del negocio. Las reglas internas solo las ve el personal.
create or replace function public.get_setting(p_key text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select s.value from public.app_settings s
  where s.key = p_key
    and (s.is_public or public.is_staff() or public.is_trusted_context())
$$;

-- ================================================== updated_at ======
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['app_settings', 'branches', 'profiles', 'customers', 'barbers', 'barber_compensation',
                           'barber_credentials', 'services', 'products', 'appointments']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================ ALTA DE USUARIOS ======
-- Cada usuario nuevo de Auth recibe un perfil. Si se registra desde la app
-- es cliente; el rol de personal solo llega por app_metadata (service_role).
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
    -- Si ya era cliente de mostrador con ese correo, se enlaza su historial
    select c.id into v_customer
    from public.customers c
    where c.profile_id is null and not c.is_anonymized and c.email = new.email::extensions.citext
    order by c.created_at
    limit 1;

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Si cambia el correo en Auth, se refleja en perfil y cliente
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles  set email = new.email where id = new.id;
    update public.customers set email = new.email where profile_id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ===================================== PROTECCIÓN DE COLUMNAS ======
-- Un usuario edita su nombre, teléfono y foto, pero nunca su rol ni su sede.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_admin() or public.is_trusted_context() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.branch_id is distinct from old.branch_id
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email then
    raise exception 'No tienes permiso para cambiar el rol, la sede, el estado o el correo del perfil'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Nombre y teléfono del perfil se copian a su ficha de cliente
create or replace function public.sync_profile_to_customer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name or new.phone is distinct from old.phone then
    update public.customers
       set full_name = new.full_name, phone = new.phone
     where profile_id = new.id and not is_anonymized;
  end if;
  return new;
end $$;

create trigger sync_profile_to_customer
  after update on public.profiles
  for each row execute function public.sync_profile_to_customer();

-- El cliente edita sus datos de contacto; las notas internas y el enlace
-- con la cuenta solo los maneja el personal.
create or replace function public.protect_customer_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if new.data_consent_at is not null and new.data_consent_version is null then
      new.data_consent_version := (select value #>> '{}' from public.app_settings where key = 'privacy_policy_version');
    end if;
    return new;
  end if;

  if public.is_front_desk() or public.is_trusted_context() then
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id
     or new.notes is distinct from old.notes
     or new.email is distinct from old.email
     or new.is_anonymized is distinct from old.is_anonymized
     or new.created_by is distinct from old.created_by then
    raise exception 'No tienes permiso para modificar estos datos del cliente' using errcode = '42501';
  end if;

  -- Una nueva autorización de datos siempre queda con fecha y versión actuales
  if new.data_consent_at is not null and new.data_consent_at is distinct from old.data_consent_at then
    new.data_consent_at      := now();
    new.data_consent_version := (select value #>> '{}' from public.app_settings where key = 'privacy_policy_version');
  end if;
  return new;
end $$;

create trigger protect_customer_columns
  before insert or update on public.customers
  for each row execute function public.protect_customer_columns();

-- =================================================== BARBEROS ======
create or replace function public.validate_barber()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_role public.app_role;
begin
  select role into v_role from public.profiles where id = new.profile_id;
  if v_role is distinct from 'barber' then
    raise exception 'El usuario asociado debe tener rol de barbero' using errcode = '23514';
  end if;

  -- El barbero puede editar su presentación (bio, foto, especialidades), nada más
  if tg_op = 'UPDATE' and not (public.is_admin() or public.is_trusted_context()) then
    if new.profile_id is distinct from old.profile_id
       or new.branch_id is distinct from old.branch_id
       or new.is_active is distinct from old.is_active
       or new.sort_order is distinct from old.sort_order
       or new.accepts_online_booking is distinct from old.accepts_online_booking
       or new.hired_on is distinct from old.hired_on then
      raise exception 'Solo un administrador puede cambiar la sede, el estado o la configuración del barbero'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger validate_barber
  before insert or update on public.barbers
  for each row execute function public.validate_barber();

create or replace function public.after_barber_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.barber_compensation (barber_id, service_commission_rate, product_commission_rate)
    values (new.id,
            public.setting_int('default_service_commission_rate', 55),
            public.setting_int('default_product_commission_rate', 10))
    on conflict (barber_id) do nothing;
  end if;
  -- La sede del perfil sigue a la del barbero
  update public.profiles set branch_id = new.branch_id
   where id = new.profile_id and branch_id is distinct from new.branch_id;
  return new;
end $$;

create trigger after_barber_write
  after insert or update of branch_id on public.barbers
  for each row execute function public.after_barber_write();

-- ==================================================== RESERVAS ======
create or replace function public.validate_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_branch uuid;
  v_active boolean;
begin
  select branch_id, is_active into v_branch, v_active from public.barbers where id = new.barber_id;
  if v_branch is distinct from new.branch_id then
    raise exception 'El barbero no pertenece a la sede de la cita' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and not v_active then
    raise exception 'El barbero no está activo' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    case new.status
      when 'in_progress' then new.checked_in_at := coalesce(new.checked_in_at, now());
      when 'completed'   then new.completed_at  := coalesce(new.completed_at, now());
      when 'cancelled'   then
        new.cancelled_at := coalesce(new.cancelled_at, now());
        new.cancelled_by := coalesce(new.cancelled_by, auth.uid());
      else null;
    end case;
  end if;

  -- Si se reprograma, el recordatorio se vuelve a programar
  if tg_op = 'UPDATE' and new.starts_at is distinct from old.starts_at then
    new.reminder_queued_at := null;
  end if;
  return new;
end $$;

create trigger validate_appointment
  before insert or update on public.appointments
  for each row execute function public.validate_appointment();

-- Encola un correo con los datos de la cita (lo envía la Edge Function)
create or replace function public.enqueue_appointment_email(p_appointment_id uuid, p_template text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.email_outbox (template, to_email, to_name, appointment_id, payload)
  select p_template, c.email, c.full_name, a.id,
         jsonb_build_object(
           'appointment_id',      a.id,
           'customer_name',       c.full_name,
           'service_name',        s.name,
           'duration_minutes',    s.duration_minutes,
           'barber_name',         b.display_name,
           'branch_name',         br.name,
           'branch_address',      br.address || coalesce(', ' || br.neighborhood, ''),
           'branch_phone',        coalesce(br.whatsapp, br.phone),
           'starts_at',           a.starts_at,
           'ends_at',             a.ends_at,
           'price',               a.price,
           'timezone',            public.app_timezone(),
           'cancellation_reason', a.cancellation_reason
         )
  from public.appointments a
  join public.customers c  on c.id = a.customer_id
  join public.services s   on s.id = a.service_id
  join public.barbers b    on b.id = a.barber_id
  join public.branches br  on br.id = a.branch_id
  where a.id = p_appointment_id
    and c.email is not null
    and not c.is_anonymized;
end $$;

create or replace function public.after_appointment_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('pending', 'confirmed') and new.starts_at > now() then
      perform public.enqueue_appointment_email(new.id, 'booking_confirmation');
    end if;
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    perform public.enqueue_appointment_email(new.id, 'booking_cancelled');
  elsif new.status in ('pending', 'confirmed')
        and (new.starts_at is distinct from old.starts_at or new.barber_id is distinct from old.barber_id) then
    perform public.enqueue_appointment_email(new.id, 'booking_rescheduled');
  end if;
  return null;
end $$;

create trigger after_appointment_write
  after insert or update on public.appointments
  for each row execute function public.after_appointment_write();

-- ================================================== INVENTARIO ======
create or replace function public.before_inventory_movement()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Los movimientos de inventario no se editan ni se borran; registra un ajuste'
      using errcode = '42501';
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

create trigger before_inventory_movement
  before insert or update or delete on public.inventory_movements
  for each row execute function public.before_inventory_movement();

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_current integer;
  v_name    text;
begin
  select quantity into v_current
  from public.product_stock
  where product_id = new.product_id and branch_id = new.branch_id
  for update;

  if coalesce(v_current, 0) + new.quantity < 0 then
    select name into v_name from public.products where id = new.product_id;
    raise exception 'Stock insuficiente de "%" (disponible: %, solicitado: %)',
      v_name, coalesce(v_current, 0), abs(new.quantity)
      using errcode = 'P0001';
  end if;

  if new.quantity > 0 then
    insert into public.product_stock (product_id, branch_id, quantity)
    values (new.product_id, new.branch_id, new.quantity)
    on conflict (product_id, branch_id)
    do update set quantity = public.product_stock.quantity + excluded.quantity, updated_at = now();
  else
    -- Una salida siempre tiene fila previa (se validó que hay existencias)
    update public.product_stock
       set quantity = quantity + new.quantity, updated_at = now()
     where product_id = new.product_id and branch_id = new.branch_id;
  end if;

  return null;
end $$;

create trigger apply_inventory_movement
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ================================================= COMISIONES ======
-- La comisión se congela en cada ítem con la tarifa vigente del barbero
create or replace function public.before_sale_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_rate numeric(5,2);
begin
  if new.barber_id is not null then
    select case when new.item_type = 'service' then service_commission_rate else product_commission_rate end
      into v_rate
    from public.barber_compensation
    where barber_id = new.barber_id;
  end if;
  new.commission_rate   := coalesce(v_rate, 0);
  new.commission_amount := round(new.quantity * new.unit_price * new.commission_rate / 100, 0);
  return new;
end $$;

create trigger before_sale_item
  before insert on public.sale_items
  for each row execute function public.before_sale_item();

-- Vender un producto descuenta inventario automáticamente
create or replace function public.after_sale_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.item_type = 'product' then
    insert into public.inventory_movements (product_id, branch_id, type, quantity, sale_id, created_by, notes)
    select new.product_id, s.branch_id, 'sale', -new.quantity, s.id, s.cashier_id, 'Venta #' || s.number
    from public.sales s where s.id = new.sale_id;
  end if;
  return null;
end $$;

create trigger after_sale_item
  after insert on public.sale_items
  for each row execute function public.after_sale_item();

-- ================================================== AUDITORÍA ======
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  if tg_op = 'UPDATE' and (v_old - 'updated_at') = (v_new - 'updated_at') then
    return null;
  end if;
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor_id)
  values (tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'barber_id')::uuid,
          tg_op, v_old, v_new, auth.uid());
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'barbers', 'barber_compensation', 'services', 'products',
                           'appointments', 'sales', 'attendance_logs', 'commission_periods']
  loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- Funciones internas: no se exponen por la API
revoke execute on function public.enqueue_appointment_email(uuid, text) from public, anon, authenticated;
revoke execute on function public.setting_int(text, integer) from public, anon, authenticated;
