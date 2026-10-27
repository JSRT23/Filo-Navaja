-- =====================================================================
-- 0400 · Seguridad a nivel de filas (RLS)
-- Regla general: el catálogo es público; los datos operativos solo los ve
-- quien los necesita. Las escrituras sensibles pasan por funciones RPC.
-- Se usa (select fn()) para que Postgres evalúe la función una sola vez.
-- =====================================================================

alter table public.app_settings          enable row level security;
alter table public.branches              enable row level security;
alter table public.branch_hours          enable row level security;
alter table public.branch_closures       enable row level security;
alter table public.profiles              enable row level security;
alter table public.customers             enable row level security;
alter table public.barbers               enable row level security;
alter table public.barber_compensation   enable row level security;
alter table public.barber_credentials    enable row level security;
alter table public.barber_schedules      enable row level security;
alter table public.barber_time_off       enable row level security;
alter table public.attendance_logs       enable row level security;
alter table public.service_categories    enable row level security;
alter table public.services              enable row level security;
alter table public.barber_services       enable row level security;
alter table public.product_categories    enable row level security;
alter table public.products              enable row level security;
alter table public.product_stock         enable row level security;
alter table public.inventory_movements   enable row level security;
alter table public.appointments          enable row level security;
alter table public.sales                 enable row level security;
alter table public.sale_items            enable row level security;
alter table public.commission_periods    enable row level security;
alter table public.commission_statements enable row level security;
alter table public.email_outbox          enable row level security;
alter table public.audit_log             enable row level security;

-- Tablas internas: ni siquiera se conceden privilegios a la API
revoke all on public.barber_credentials, public.email_outbox from anon, authenticated;
revoke all on public.audit_log from anon;
revoke insert, update, delete on public.audit_log from authenticated;

-- ============================================== CONFIGURACIÓN =====
create policy "settings: públicas para todos"
  on public.app_settings for select to anon, authenticated
  using (is_public or (select public.is_admin()));

create policy "settings: admin actualiza"
  on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ===================================================== SEDES =====
create policy "branches: lectura pública"
  on public.branches for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "branches: admin gestiona"
  on public.branches for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "branch_hours: lectura pública"
  on public.branch_hours for select to anon, authenticated using (true);

create policy "branch_hours: admin gestiona"
  on public.branch_hours for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "branch_closures: lectura pública"
  on public.branch_closures for select to anon, authenticated using (true);

create policy "branch_closures: admin gestiona"
  on public.branch_closures for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ================================================== PERFILES =====
create policy "profiles: cada quien ve el suyo; el personal ve al personal"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_front_desk())
    or ((select public.is_staff()) and role <> 'client')
  );

create policy "profiles: cada quien edita el suyo; admin edita todos"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ================================================== CLIENTES =====
create policy "customers: el cliente, recepción y su barbero"
  on public.customers for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_front_desk())
    or exists (
      select 1 from public.appointments a
      where a.customer_id = customers.id and a.barber_id = (select public.current_barber_id())
    )
  );

create policy "customers: recepción registra clientes de mostrador"
  on public.customers for insert to authenticated
  with check ((select public.is_front_desk()));

create policy "customers: el cliente edita sus datos; recepción también"
  on public.customers for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_front_desk()))
  with check (profile_id = (select auth.uid()) or (select public.is_front_desk()));

-- ================================================== BARBEROS =====
create policy "barbers: perfil público de los activos"
  on public.barbers for select to anon, authenticated
  using (is_active or (select public.is_staff()));

create policy "barbers: admin gestiona"
  on public.barbers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "barbers: el barbero edita su presentación"
  on public.barbers for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "compensation: admin y el propio barbero"
  on public.barber_compensation for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy "compensation: admin gestiona"
  on public.barber_compensation for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "barber_services: lectura pública"
  on public.barber_services for select to anon, authenticated using (true);

create policy "barber_services: admin gestiona"
  on public.barber_services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ================================================== HORARIOS =====
create policy "schedules: lectura pública"
  on public.barber_schedules for select to anon, authenticated using (true);

create policy "schedules: admin y recepción de la sede"
  on public.barber_schedules for all to authenticated
  using ((select public.can_manage_branch((select b.branch_id from public.barbers b where b.id = barber_id))))
  with check ((select public.can_manage_branch((select b.branch_id from public.barbers b where b.id = barber_id))));

create policy "time_off: recepción y el propio barbero"
  on public.barber_time_off for select to authenticated
  using ((select public.is_front_desk()) or barber_id = (select public.current_barber_id()));

create policy "time_off: admin y recepción de la sede"
  on public.barber_time_off for all to authenticated
  using ((select public.can_manage_branch((select b.branch_id from public.barbers b where b.id = barber_id))))
  with check ((select public.can_manage_branch((select b.branch_id from public.barbers b where b.id = barber_id))));

-- ================================================ ASISTENCIA =====
-- Solo lectura: las marcaciones se crean con register_attendance()
create policy "attendance: admin, recepción de la sede y el propio barbero"
  on public.attendance_logs for select to authenticated
  using (
    (select public.can_manage_branch(branch_id))
    or barber_id = (select public.current_barber_id())
  );

-- ================================================== CATÁLOGO =====
create policy "service_categories: lectura pública"
  on public.service_categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "service_categories: admin gestiona"
  on public.service_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "services: lectura pública"
  on public.services for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "services: admin gestiona"
  on public.services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_categories: lectura pública"
  on public.product_categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "product_categories: admin gestiona"
  on public.product_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "products: lectura pública"
  on public.products for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy "products: admin gestiona"
  on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ================================================ INVENTARIO =====
create policy "stock: lectura pública (disponible / agotado)"
  on public.product_stock for select to anon, authenticated using (true);

create policy "movements: el personal consulta"
  on public.inventory_movements for select to authenticated
  using ((select public.is_staff()));

create policy "movements: recepción registra entradas y ajustes"
  on public.inventory_movements for insert to authenticated
  with check (
    (select public.can_manage_branch(branch_id))
    and type in ('purchase', 'waste', 'adjustment')
  );

-- ================================================== RESERVAS =====
-- Se crean con book_appointment() / staff_create_appointment()
create policy "appointments: cliente, su barbero y recepción de la sede"
  on public.appointments for select to authenticated
  using (
    customer_id = (select public.current_customer_id())
    or barber_id = (select public.current_barber_id())
    or (select public.can_manage_branch(branch_id))
  );

create policy "appointments: recepción edita notas de su sede"
  on public.appointments for update to authenticated
  using ((select public.can_manage_branch(branch_id)))
  with check ((select public.can_manage_branch(branch_id)));

-- ==================================================== VENTAS =====
-- Se crean con create_sale() y se anulan con void_sale()
create policy "sales: admin y recepción de la sede"
  on public.sales for select to authenticated
  using ((select public.can_manage_branch(branch_id)));

create policy "sale_items: según la venta o el barbero que lo prestó"
  on public.sale_items for select to authenticated
  using (
    barber_id = (select public.current_barber_id())
    or exists (select 1 from public.sales s where s.id = sale_id and public.can_manage_branch(s.branch_id))
  );

-- ================================================ COMISIONES =====
create policy "commission_periods: el personal consulta"
  on public.commission_periods for select to authenticated
  using ((select public.is_admin()) or (select public.current_barber_id()) is not null);

create policy "commission_statements: admin y el propio barbero"
  on public.commission_statements for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

-- ================================================= AUDITORÍA =====
create policy "audit_log: solo admin"
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));
