-- =====================================================================
-- 0700 · Comisiones, reportes, panel de indicadores y vistas
-- =====================================================================

-- Quincena que contiene una fecha: 1–15 o 16–fin de mes
create or replace function public.get_fortnight(p_date date default null)
returns table (starts_on date, ends_on date)
language sql stable set search_path = ''
as $$
  with d as (select coalesce(p_date, (now() at time zone public.app_timezone())::date) as day)
  select case when extract(day from day) <= 15 then date_trunc('month', day)::date
              else (date_trunc('month', day) + interval '15 days')::date end,
         case when extract(day from day) <= 15 then (date_trunc('month', day) + interval '14 days')::date
              else (date_trunc('month', day) + interval '1 month - 1 day')::date end
  from d
$$;

-- ==================================================== COMISIONES =====
-- Admin ve a todos; un barbero solo ve lo suyo.
create or replace function public.commission_summary(p_from date, p_to date, p_barber_id uuid default null)
returns table (
  barber_id uuid, barber_name text, branch_id uuid, branch_name text,
  services_count integer, services_revenue numeric, products_count integer, products_revenue numeric,
  service_commission numeric, product_commission numeric, total_commission numeric
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz     text := public.app_timezone();
  v_barber uuid := p_barber_id;
begin
  if public.is_admin() or public.is_trusted_context() then
    null;
  elsif public.current_barber_id() is not null then
    v_barber := public.current_barber_id();
  else
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;

  return query
  select b.id, b.display_name, br.id, br.name,
         coalesce(sum(i.quantity) filter (where i.item_type = 'service'), 0)::integer,
         coalesce(sum(i.line_total) filter (where i.item_type = 'service'), 0),
         coalesce(sum(i.quantity) filter (where i.item_type = 'product'), 0)::integer,
         coalesce(sum(i.line_total) filter (where i.item_type = 'product'), 0),
         coalesce(sum(i.commission_amount) filter (where i.item_type = 'service'), 0),
         coalesce(sum(i.commission_amount) filter (where i.item_type = 'product'), 0),
         coalesce(sum(i.commission_amount), 0)
  from public.sale_items i
  join public.sales s     on s.id = i.sale_id and s.status = 'completed'
  join public.barbers b   on b.id = i.barber_id
  join public.branches br on br.id = b.branch_id
  where (s.created_at at time zone v_tz)::date between p_from and p_to
    and (v_barber is null or i.barber_id = v_barber)
  group by b.id, b.display_name, br.id, br.name
  order by 11 desc;
end $$;

-- Cierra una quincena y congela el estado de cuenta de cada barbero
create or replace function public.close_commission_period(p_starts_on date, p_ends_on date)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'Solo un administrador puede cerrar periodos' using errcode = '42501';
  end if;
  if p_ends_on >= (now() at time zone public.app_timezone())::date then
    raise exception 'Solo se puede cerrar un periodo que ya terminó' using errcode = 'P0001';
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

create or replace function public.mark_commission_period_paid(p_period_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_trusted_context()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.commission_periods set status = 'paid', paid_at = now()
   where id = p_period_id and status = 'closed';
  if not found then
    raise exception 'El periodo no existe o ya estaba pagado' using errcode = 'P0001';
  end if;
end $$;

-- ==================================================== ASISTENCIA =====
-- Días programados, trabajados, ausencias, llegadas tarde y minutos trabajados
create or replace function public.attendance_report(p_from date, p_to date, p_branch_id uuid default null)
returns table (
  barber_id uuid, barber_name text, branch_name text,
  scheduled_days integer, worked_days integer, absences integer, late_arrivals integer, worked_minutes integer
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz     text := public.app_timezone();
  v_today  date := (now() at time zone v_tz)::date;
  v_tol    interval := make_interval(mins => public.setting_int('late_tolerance_minutes', 10));
  v_branch uuid := p_branch_id;
  v_barber uuid;
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
    where not exists (select 1 from public.branch_closures c
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

-- ================================================ PANEL (KPIs) =====
create or replace function public.dashboard_summary(p_from date, p_to date, p_branch_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tz     text := public.app_timezone();
  v_branch uuid := p_branch_id;
  v_start  timestamptz;
  v_end    timestamptz;
  v_result jsonb;
begin
  if public.is_admin() or public.is_trusted_context() then
    null;
  elsif public.app_current_role() = 'receptionist' then
    v_branch := public.current_branch_id();
  else
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;

  v_start := p_from::timestamp at time zone v_tz;
  v_end   := (p_to + 1)::timestamp at time zone v_tz;

  with s as (
    select * from public.sales
    where status = 'completed' and created_at >= v_start and created_at < v_end
      and (v_branch is null or branch_id = v_branch)
  ),
  i as (
    select i.* from public.sale_items i join s on s.id = i.sale_id
  ),
  a as (
    select * from public.appointments
    where starts_at >= v_start and starts_at < v_end
      and (v_branch is null or branch_id = v_branch)
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to, 'branch_id', v_branch),
    'revenue', jsonb_build_object(
      'total',    coalesce((select sum(total) from s), 0),
      'services', coalesce((select sum(line_total) from i where item_type = 'service'), 0),
      'products', coalesce((select sum(line_total) from i where item_type = 'product'), 0),
      'discounts', coalesce((select sum(discount) from s), 0),
      'sales_count', (select count(*) from s),
      'average_ticket', coalesce((select round(avg(total), 0) from s), 0),
      'by_payment_method', coalesce((select jsonb_object_agg(payment_method, amount)
                                     from (select payment_method, sum(total) amount from s group by 1) x), '{}'::jsonb)
    ),
    'appointments', jsonb_build_object(
      'total',       (select count(*) from a),
      'completed',   (select count(*) from a where status = 'completed'),
      'cancelled',   (select count(*) from a where status = 'cancelled'),
      'no_show',     (select count(*) from a where status = 'no_show'),
      'upcoming',    (select count(*) from a where status in ('pending', 'confirmed') and starts_at > now()),
      'no_show_rate', coalesce((select round(100.0 * count(*) filter (where status = 'no_show')
                                       / nullif(count(*) filter (where status in ('completed', 'no_show')), 0), 1) from a), 0),
      'online_share', coalesce((select round(100.0 * count(*) filter (where source = 'online')
                                       / nullif(count(*) filter (where status <> 'cancelled'), 0), 1) from a), 0)
    ),
    'top_services', coalesce((
      select jsonb_agg(x order by x.count desc) from (
        select description as name, sum(quantity)::integer as count, sum(line_total) as revenue
        from i where item_type = 'service' group by description order by 2 desc limit 5) x), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(x order by x.count desc) from (
        select description as name, sum(quantity)::integer as count, sum(line_total) as revenue
        from i where item_type = 'product' group by description order by 2 desc limit 5) x), '[]'::jsonb),
    'top_barbers', coalesce((
      select jsonb_agg(x order by x.revenue desc) from (
        select b.id as barber_id, b.display_name as name, count(*) filter (where i.item_type = 'service')::integer as services,
               sum(i.line_total) as revenue
        from i join public.barbers b on b.id = i.barber_id
        group by b.id, b.display_name order by 4 desc limit 5) x), '[]'::jsonb),
    'daily_revenue', coalesce((
      select jsonb_agg(x order by x.day) from (
        select (created_at at time zone v_tz)::date as day, sum(total) as revenue, count(*)::integer as sales
        from s group by 1) x), '[]'::jsonb),
    'low_stock_count', (
      select count(*) from public.product_stock ps join public.products p on p.id = ps.product_id
      where p.is_active and ps.quantity <= p.min_stock and (v_branch is null or ps.branch_id = v_branch))
  ) into v_result;

  return v_result;
end $$;

-- ======================================================== VISTAS =====
create or replace view public.v_low_stock
with (security_invoker = true) as
select p.id as product_id, p.sku, p.name, p.brand, br.id as branch_id, br.name as branch_name,
       ps.quantity, p.min_stock, (p.min_stock - ps.quantity) as missing
from public.product_stock ps
join public.products p   on p.id = ps.product_id and p.is_active
join public.branches br  on br.id = ps.branch_id
where ps.quantity <= p.min_stock;

-- Exportación de ventas a CSV (para el proveedor de facturación electrónica)
create or replace view public.v_sales_export
with (security_invoker = true) as
select s.number                                        as venta,
       (s.created_at at time zone public.app_timezone()) as fecha,
       br.name                                         as sede,
       coalesce(c.full_name, 'Consumidor final')        as cliente,
       c.phone                                         as telefono_cliente,
       c.email                                         as correo_cliente,
       s.payment_method                                as medio_pago,
       i.item_type                                     as tipo,
       i.description                                   as descripcion,
       i.quantity                                      as cantidad,
       i.unit_price                                    as precio_unitario,
       i.line_total                                    as total_linea,
       b.display_name                                  as barbero,
       s.discount                                      as descuento_venta,
       s.total                                         as total_venta,
       s.status                                        as estado,
       s.branch_id,
       s.created_at
from public.sales s
join public.sale_items i     on i.sale_id = s.id
join public.branches br      on br.id = s.branch_id
left join public.customers c on c.id = s.customer_id
left join public.barbers b   on b.id = i.barber_id;

-- Permisos
revoke execute on function public.commission_summary(date, date, uuid) from public, anon;
revoke execute on function public.close_commission_period(date, date) from public, anon;
revoke execute on function public.mark_commission_period_paid(uuid) from public, anon;
revoke execute on function public.attendance_report(date, date, uuid) from public, anon;
revoke execute on function public.dashboard_summary(date, date, uuid) from public, anon;

grant execute on function public.get_fortnight(date) to anon, authenticated;
grant execute on function public.commission_summary(date, date, uuid) to authenticated;
grant execute on function public.close_commission_period(date, date) to authenticated;
grant execute on function public.mark_commission_period_paid(uuid) to authenticated;
grant execute on function public.attendance_report(date, date, uuid) to authenticated;
grant execute on function public.dashboard_summary(date, date, uuid) to authenticated;

revoke all on public.v_sales_export, public.v_low_stock from anon;
