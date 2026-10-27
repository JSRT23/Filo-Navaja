-- =====================================================================
-- 0600 · Operación diaria: PIN y asistencia, caja y ventas, inventario
-- =====================================================================

insert into public.app_settings (key, value, description, is_public) values
  ('max_discount_percent_receptionist', '20', 'Descuento máximo (%) que puede aplicar recepción en una venta', false)
on conflict (key) do nothing;

-- =========================================================== PIN =====
create or replace function public.set_barber_pin(p_barber_id uuid, p_pin text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare v_branch uuid;
begin
  select branch_id into v_branch from public.barbers where id = p_barber_id;
  if v_branch is null then
    raise exception 'Barbero no encontrado' using errcode = 'P0002';
  end if;
  if not (public.can_manage_branch(v_branch) or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'El PIN debe tener entre 4 y 6 dígitos' using errcode = '22023';
  end if;
  if p_pin ~ '^(\d)\1+$' or '0123456789' like '%' || p_pin || '%' or '9876543210' like '%' || p_pin || '%' then
    raise exception 'El PIN es demasiado fácil de adivinar (evita 1111 o 1234)' using errcode = '22023';
  end if;

  insert into public.barber_credentials (barber_id, pin_hash)
  values (p_barber_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  on conflict (barber_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
end $$;

-- ==================================================== ASISTENCIA =====
-- Kiosco de la sede: el barbero toca su foto y digita su PIN.
-- Devuelve JSON en vez de lanzar errores para que los intentos fallidos
-- queden guardados (un error desharía el conteo).
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
  if not (public.can_manage_branch(v_barber.branch_id)
          or coalesce(v_barber.profile_id = auth.uid(), false)
          or public.is_trusted_context()) then
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

-- Corrección manual (olvidó marcar). Queda auditada y exige justificación.
create or replace function public.record_attendance_manual(
  p_barber_id uuid,
  p_type public.attendance_type,
  p_recorded_at timestamptz,
  p_notes text
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_branch uuid;
  v_id     uuid;
begin
  select branch_id into v_branch from public.barbers where id = p_barber_id;
  if v_branch is null then
    raise exception 'Barbero no encontrado' using errcode = 'P0002';
  end if;
  if not (public.can_manage_branch(v_branch) or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_notes, '')), '') is null then
    raise exception 'Escribe el motivo de la corrección' using errcode = '22023';
  end if;
  if p_recorded_at > now() then
    raise exception 'No se pueden registrar marcaciones en el futuro' using errcode = '22023';
  end if;

  insert into public.attendance_logs (barber_id, branch_id, type, recorded_at, source, recorded_by, notes)
  values (p_barber_id, v_branch, p_type, p_recorded_at, 'manual', auth.uid(), btrim(p_notes))
  returning id into v_id;
  return v_id;
end $$;

-- Pantalla del kiosco: barberos de la sede y su estado de hoy
create or replace function public.get_kiosk_board(p_branch_id uuid)
returns table (
  barber_id uuid, display_name text, photo_url text, has_pin boolean,
  status text, last_event_at timestamptz, scheduled_start time, scheduled_end time
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz        text := public.app_timezone();
  v_day_start timestamptz := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
begin
  if not (public.can_manage_branch(p_branch_id) or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select b.id, b.display_name, b.photo_url,
         exists (select 1 from public.barber_credentials c where c.barber_id = b.id),
         case when l.type = 'check_in' then 'in' when l.type = 'check_out' then 'out' else 'not_arrived' end,
         l.recorded_at, s.start_time, s.end_time
  from public.barbers b
  left join lateral (
    select a.type, a.recorded_at from public.attendance_logs a
    where a.barber_id = b.id and a.recorded_at >= v_day_start
    order by a.recorded_at desc limit 1
  ) l on true
  left join public.barber_schedules s
         on s.barber_id = b.id and s.weekday = extract(dow from now() at time zone v_tz)::smallint
  where b.branch_id = p_branch_id and b.is_active
  order by b.sort_order, b.display_name;
end $$;

-- ======================================================= VENTAS =====
-- p_items: [{"type":"service","service_id":"…","barber_id":"…","quantity":1},
--           {"type":"product","product_id":"…","quantity":2,"barber_id":"…"}]
-- "unit_price" en un ítem solo lo respeta si quien cobra es admin.
create or replace function public.create_sale(
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_customer_id uuid default null,
  p_appointment_id uuid default null,
  p_discount numeric default 0,
  p_notes text default null
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_is_admin boolean := public.is_admin() or public.is_trusted_context();
  v_max_pct  integer := public.setting_int('max_discount_percent_receptionist', 20);
  v_appt     public.appointments%rowtype;
  v_customer uuid := p_customer_id;
  v_sale_id  uuid;
  v_number   bigint;
  v_item     jsonb;
  v_type     text;
  v_qty      integer;
  v_barber   uuid;
  v_service  public.services%rowtype;
  v_product  public.products%rowtype;
  v_price    numeric(12,2);
  v_subtotal numeric(12,2);
  v_discount numeric(12,2) := coalesce(p_discount, 0);
begin
  if not (public.can_manage_branch(p_branch_id) or public.is_trusted_context()) then
    raise exception 'No autorizado para cobrar en esta sede' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un ítem' using errcode = '22023';
  end if;

  if p_appointment_id is not null then
    select * into v_appt from public.appointments where id = p_appointment_id for update;
    if not found or v_appt.branch_id <> p_branch_id then
      raise exception 'La cita no existe o es de otra sede' using errcode = 'P0001';
    end if;
    if v_appt.status in ('cancelled', 'no_show') then
      raise exception 'No se puede cobrar una cita % ', v_appt.status using errcode = 'P0001';
    end if;
    if exists (select 1 from public.sales where appointment_id = p_appointment_id and status = 'completed') then
      raise exception 'Esta cita ya fue cobrada' using errcode = 'P0001';
    end if;
    v_customer := coalesce(v_customer, v_appt.customer_id);
  end if;

  insert into public.sales (branch_id, customer_id, appointment_id, cashier_id, payment_method, notes)
  values (p_branch_id, v_customer, p_appointment_id, auth.uid(), p_payment_method, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id, number into v_sale_id, v_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_type   := v_item ->> 'type';
    v_qty    := coalesce((v_item ->> 'quantity')::integer, 1);
    v_barber := nullif(v_item ->> 'barber_id', '')::uuid;

    if v_qty <= 0 then
      raise exception 'La cantidad debe ser mayor que cero' using errcode = '22023';
    end if;
    if v_barber is not null and not exists (select 1 from public.barbers where id = v_barber and branch_id = p_branch_id) then
      raise exception 'El barbero indicado no pertenece a esta sede' using errcode = 'P0001';
    end if;

    if v_type = 'service' then
      select * into v_service from public.services where id = (v_item ->> 'service_id')::uuid;
      if not found then
        raise exception 'Servicio no encontrado' using errcode = 'P0002';
      end if;
      if v_barber is null and p_appointment_id is not null then
        v_barber := v_appt.barber_id;
      end if;
      if v_barber is null then
        raise exception 'Indica qué barbero prestó "%"', v_service.name using errcode = '22023';
      end if;
      v_price := case
        when v_is_admin and v_item ? 'unit_price' then (v_item ->> 'unit_price')::numeric
        when p_appointment_id is not null and v_service.id = v_appt.service_id then v_appt.price
        else v_service.price end;

      insert into public.sale_items (sale_id, item_type, service_id, barber_id, description, quantity, unit_price)
      values (v_sale_id, 'service', v_service.id, v_barber, v_service.name, v_qty, v_price);

    elsif v_type = 'product' then
      select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and is_active;
      if not found then
        raise exception 'Producto no encontrado o inactivo' using errcode = 'P0002';
      end if;
      v_price := case when v_is_admin and v_item ? 'unit_price' then (v_item ->> 'unit_price')::numeric else v_product.price end;

      insert into public.sale_items (sale_id, item_type, product_id, barber_id, description, quantity, unit_price)
      values (v_sale_id, 'product', v_product.id, v_barber,
              v_product.name || coalesce(' · ' || v_product.brand, ''), v_qty, v_price);
    else
      raise exception 'Tipo de ítem inválido: % (usa "service" o "product")', coalesce(v_type, 'vacío') using errcode = '22023';
    end if;
  end loop;

  select coalesce(sum(line_total), 0) into v_subtotal from public.sale_items where sale_id = v_sale_id;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'El descuento debe estar entre 0 y el subtotal' using errcode = '22023';
  end if;
  if not v_is_admin and v_subtotal > 0 and v_discount * 100 / v_subtotal > v_max_pct then
    raise exception 'Recepción puede aplicar máximo % %% de descuento', v_max_pct using errcode = '42501';
  end if;

  update public.sales
     set subtotal = v_subtotal, discount = v_discount, total = v_subtotal - v_discount
   where id = v_sale_id;

  if p_appointment_id is not null and v_appt.status <> 'completed' then
    update public.appointments set status = 'completed' where id = p_appointment_id;
  end if;

  return jsonb_build_object('sale_id', v_sale_id, 'number', v_number,
                            'subtotal', v_subtotal, 'discount', v_discount, 'total', v_subtotal - v_discount);
end $$;

-- Anular una venta (solo admin). Devuelve los productos al inventario.
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_sale public.sales%rowtype;
  v_day  date;
begin
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'Solo un administrador puede anular ventas' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Escribe el motivo de la anulación' using errcode = '22023';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'La venta ya estaba anulada' using errcode = 'P0001';
  end if;

  v_day := (v_sale.created_at at time zone public.app_timezone())::date;
  if exists (select 1 from public.commission_periods where v_day between starts_on and ends_on) then
    raise exception 'La venta pertenece a un periodo de comisiones ya cerrado' using errcode = 'P0001';
  end if;

  insert into public.inventory_movements (product_id, branch_id, type, quantity, sale_id, notes)
  select i.product_id, v_sale.branch_id, 'return', i.quantity, v_sale.id, 'Anulación venta #' || v_sale.number
  from public.sale_items i
  where i.sale_id = v_sale.id and i.item_type = 'product';

  update public.sales
     set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = v_sale.id;
end $$;

-- =================================================== INVENTARIO =====
-- Entrada de mercancía
create or replace function public.register_stock_entry(
  p_product_id uuid, p_branch_id uuid, p_quantity integer, p_unit_cost numeric default null, p_notes text default null
)
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare v_qty integer;
begin
  if not (public.can_manage_branch(p_branch_id) or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero' using errcode = '22023';
  end if;

  insert into public.inventory_movements (product_id, branch_id, type, quantity, unit_cost, notes)
  values (p_product_id, p_branch_id, 'purchase', p_quantity, p_unit_cost, p_notes);

  if p_unit_cost is not null and p_unit_cost >= 0 then
    update public.products set cost = p_unit_cost where id = p_product_id;
  end if;

  select quantity into v_qty from public.product_stock where product_id = p_product_id and branch_id = p_branch_id;
  return v_qty;
end $$;

-- Ajuste por conteo físico: se indica cuánto hay realmente en la vitrina
create or replace function public.adjust_stock(p_product_id uuid, p_branch_id uuid, p_counted_quantity integer, p_reason text)
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_current integer;
  v_delta   integer;
begin
  if not (public.can_manage_branch(p_branch_id) or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_counted_quantity is null or p_counted_quantity < 0 then
    raise exception 'La cantidad contada no puede ser negativa' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Escribe el motivo del ajuste' using errcode = '22023';
  end if;

  select coalesce((select quantity from public.product_stock
                   where product_id = p_product_id and branch_id = p_branch_id for update), 0)
    into v_current;
  v_delta := p_counted_quantity - v_current;

  if v_delta <> 0 then
    insert into public.inventory_movements (product_id, branch_id, type, quantity, notes)
    values (p_product_id, p_branch_id, 'adjustment', v_delta, btrim(p_reason));
  end if;
  return p_counted_quantity;
end $$;

-- Traslado entre sedes (solo admin)
create or replace function public.transfer_stock(
  p_product_id uuid, p_from_branch_id uuid, p_to_branch_id uuid, p_quantity integer, p_notes text default null
)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'Solo un administrador puede trasladar inventario' using errcode = '42501';
  end if;
  if p_from_branch_id = p_to_branch_id then
    raise exception 'Las sedes de origen y destino deben ser distintas' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero' using errcode = '22023';
  end if;

  insert into public.inventory_movements (product_id, branch_id, type, quantity, notes)
  values (p_product_id, p_from_branch_id, 'transfer_out', -p_quantity, p_notes),
         (p_product_id, p_to_branch_id,   'transfer_in',   p_quantity, p_notes);
end $$;

-- Permisos de ejecución
revoke execute on function public.set_barber_pin(uuid, text) from public, anon;
revoke execute on function public.register_attendance(uuid, text) from public, anon;
revoke execute on function public.record_attendance_manual(uuid, public.attendance_type, timestamptz, text) from public, anon;
revoke execute on function public.get_kiosk_board(uuid) from public, anon;
revoke execute on function public.create_sale(uuid, public.payment_method, jsonb, uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.void_sale(uuid, text) from public, anon;
revoke execute on function public.register_stock_entry(uuid, uuid, integer, numeric, text) from public, anon;
revoke execute on function public.adjust_stock(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.transfer_stock(uuid, uuid, uuid, integer, text) from public, anon;

grant execute on function public.set_barber_pin(uuid, text) to authenticated, service_role;
grant execute on function public.register_attendance(uuid, text) to authenticated;
grant execute on function public.record_attendance_manual(uuid, public.attendance_type, timestamptz, text) to authenticated;
grant execute on function public.get_kiosk_board(uuid) to authenticated;
grant execute on function public.create_sale(uuid, public.payment_method, jsonb, uuid, uuid, numeric, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.register_stock_entry(uuid, uuid, integer, numeric, text) to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, integer, text) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text) to authenticated;
