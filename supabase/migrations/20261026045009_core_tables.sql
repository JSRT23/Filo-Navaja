-- =====================================================================
-- 0200 · Tablas del dominio
-- Sedes · Perfiles · Clientes · Barberos · Horarios · Asistencia
-- Catálogo · Inventario · Reservas · Ventas · Comisiones · Correos · Auditoría
-- =====================================================================

-- =========================================================== SEDES ====
create table public.branches (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  address      text not null,
  neighborhood text,
  city         text not null default 'Montería',
  phone        text,
  whatsapp     text,
  email        extensions.citext,
  latitude     numeric(9,6),
  longitude    numeric(9,6),
  cover_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.branches is 'Sedes de la barbería (La Castellana, Centro).';

-- Horario de apertura por día (0 = domingo … 6 = sábado, igual que extract(dow))
create table public.branch_hours (
  branch_id  uuid not null references public.branches(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  opens_at   time,
  closes_at  time,
  is_closed  boolean not null default false,
  primary key (branch_id, weekday),
  constraint branch_hours_valid check (is_closed or (opens_at is not null and closes_at is not null and opens_at < closes_at))
);

-- Días de cierre: festivos, inventario, eventos. branch_id null = todas las sedes
create table public.branch_closures (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid references public.branches(id) on delete cascade,
  closed_on  date not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create unique index branch_closures_unique on public.branch_closures (coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), closed_on);

-- ======================================================== PERFILES ====
-- Un perfil por usuario de Supabase Auth. El rol lo asigna solo un admin.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       extensions.citext,
  phone       text,
  avatar_url  text,
  role        public.app_role not null default 'client',
  branch_id   uuid references public.branches(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_staff_branch check (role in ('admin', 'client') or branch_id is not null)
);
create index profiles_role_idx on public.profiles (role);

-- ======================================================== CLIENTES ====
-- Incluye clientes con cuenta (profile_id) y clientes de mostrador sin cuenta.
create table public.customers (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid unique references public.profiles(id) on delete set null,
  full_name            text not null,
  phone                text,
  email                extensions.citext,
  birth_date           date,
  notes                text,                    -- preferencias (solo personal)
  data_consent_at      timestamptz,             -- autorización Ley 1581 de 2012
  data_consent_version text,
  marketing_opt_in     boolean not null default false,
  is_anonymized        boolean not null default false,
  preferred_branch_id  uuid references public.branches(id) on delete set null,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index customers_phone_idx on public.customers (phone);
create index customers_email_idx on public.customers (email);
create index customers_name_idx  on public.customers (lower(full_name));

-- ======================================================== BARBEROS ====
create table public.barbers (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null unique references public.profiles(id) on delete restrict,
  branch_id              uuid not null references public.branches(id),
  display_name           text not null,
  bio                    text,
  specialties            text[] not null default '{}',
  photo_url              text,
  instagram              text,
  calendar_color         text not null default '#C8A96A' check (calendar_color ~ '^#[0-9A-Fa-f]{6}$'),
  accepts_online_booking boolean not null default true,
  is_active              boolean not null default true,
  sort_order             integer not null default 0,
  hired_on               date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index barbers_branch_idx on public.barbers (branch_id) where is_active;

-- Compensación separada: solo la ven el admin y el propio barbero
create table public.barber_compensation (
  barber_id               uuid primary key references public.barbers(id) on delete cascade,
  service_commission_rate numeric(5,2) not null check (service_commission_rate between 0 and 100),
  product_commission_rate numeric(5,2) not null check (product_commission_rate between 0 and 100),
  updated_at              timestamptz not null default now()
);

-- Credenciales del kiosco (PIN en bcrypt). Sin políticas: solo funciones del sistema
create table public.barber_credentials (
  barber_id       uuid primary key references public.barbers(id) on delete cascade,
  pin_hash        text not null,
  failed_attempts smallint not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

-- Horario semanal de cada barbero
create table public.barber_schedules (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  break_start time,
  break_end   time,
  unique (barber_id, weekday),
  constraint barber_schedules_range check (start_time < end_time),
  constraint barber_schedules_break check (
    (break_start is null and break_end is null)
    or (break_start < break_end and break_start >= start_time and break_end <= end_time)
  )
);

-- Novedades: permisos, incapacidades, vacaciones
create table public.barber_time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  type       public.time_off_type not null default 'leave',
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint barber_time_off_range check (starts_at < ends_at)
);
create index barber_time_off_idx on public.barber_time_off (barber_id, starts_at);

-- Marcaciones de entrada y salida
create table public.attendance_logs (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers(id) on delete cascade,
  branch_id   uuid not null references public.branches(id),
  type        public.attendance_type not null,
  recorded_at timestamptz not null default now(),
  source      public.attendance_source not null default 'kiosk',
  recorded_by uuid references public.profiles(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);
create index attendance_barber_idx on public.attendance_logs (barber_id, recorded_at desc);
create index attendance_branch_idx on public.attendance_logs (branch_id, recorded_at desc);

-- ======================================================== CATÁLOGO ====
create table public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

create table public.services (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references public.service_categories(id) on delete restrict,
  name             text not null,
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description      text,
  duration_minutes integer not null check (duration_minutes between 5 and 480 and duration_minutes % 5 = 0),
  price            numeric(12,2) not null check (price >= 0),
  image_url        text,
  is_featured      boolean not null default false,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index services_category_idx on public.services (category_id) where is_active;

-- Qué servicios presta cada barbero
create table public.barber_services (
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (barber_id, service_id)
);
create index barber_services_service_idx on public.barber_services (service_id);

create table public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  sku         text not null unique,
  name        text not null,
  brand       text,
  description text,
  price       numeric(12,2) not null check (price >= 0),
  cost        numeric(12,2) not null default 0 check (cost >= 0),
  image_url   text,
  min_stock   integer not null default 3 check (min_stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ====================================================== INVENTARIO ====
-- Existencias actuales por sede (solo las modifica el trigger de movimientos)
create table public.product_stock (
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id  uuid not null references public.branches(id) on delete cascade,
  quantity   integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, branch_id)
);

-- ========================================================= RESERVAS ====
create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  branch_id           uuid not null references public.branches(id),
  barber_id           uuid not null references public.barbers(id),
  customer_id         uuid not null references public.customers(id),
  service_id          uuid not null references public.services(id),
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              public.appointment_status not null default 'confirmed',
  source              public.appointment_source not null default 'online',
  price               numeric(12,2) not null check (price >= 0),   -- precio congelado al reservar
  customer_notes      text,
  internal_notes      text,
  checked_in_at       timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  reminder_queued_at  timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint appointments_range check (starts_at < ends_at),
  -- Garantía a nivel de base de datos: un barbero no puede tener dos citas cruzadas
  constraint appointments_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'in_progress', 'completed'))
);
create index appointments_branch_time_idx   on public.appointments (branch_id, starts_at);
create index appointments_barber_time_idx   on public.appointments (barber_id, starts_at);
create index appointments_customer_time_idx on public.appointments (customer_id, starts_at desc);
create index appointments_reminder_idx      on public.appointments (starts_at) where status = 'confirmed' and reminder_queued_at is null;

-- =========================================================== VENTAS ====
create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  number         bigint generated always as identity unique,   -- consecutivo interno
  branch_id      uuid not null references public.branches(id),
  customer_id    uuid references public.customers(id) on delete set null,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  cashier_id     uuid references public.profiles(id) on delete set null,
  payment_method public.payment_method not null,
  subtotal       numeric(12,2) not null default 0 check (subtotal >= 0),
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  total          numeric(12,2) not null default 0 check (total >= 0),
  status         public.sale_status not null default 'completed',
  notes          text,
  voided_at      timestamptz,
  voided_by      uuid references public.profiles(id) on delete set null,
  void_reason    text,
  created_at     timestamptz not null default now(),
  constraint sales_discount_le_subtotal check (discount <= subtotal)
);
create index sales_branch_time_idx on public.sales (branch_id, created_at desc);

create table public.sale_items (
  id                uuid primary key default gen_random_uuid(),
  sale_id           uuid not null references public.sales(id) on delete cascade,
  item_type         public.sale_item_type not null,
  service_id        uuid references public.services(id),
  product_id        uuid references public.products(id),
  barber_id         uuid references public.barbers(id),   -- quien prestó el servicio o vendió
  description       text not null,                        -- nombre congelado
  quantity          integer not null default 1 check (quantity > 0),
  unit_price        numeric(12,2) not null check (unit_price >= 0),
  line_total        numeric(12,2) generated always as (quantity * unit_price) stored,
  commission_rate   numeric(5,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  constraint sale_items_kind check (
    (item_type = 'service' and service_id is not null and product_id is null and barber_id is not null)
    or (item_type = 'product' and product_id is not null and service_id is null)
  )
);
create index sale_items_sale_idx   on public.sale_items (sale_id);
create index sale_items_barber_idx on public.sale_items (barber_id);

-- Movimientos de inventario (inmutables: se corrigen con un ajuste)
create table public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  branch_id  uuid not null references public.branches(id),
  type       public.inventory_movement_type not null,
  quantity   integer not null check (quantity <> 0),
  unit_cost  numeric(12,2),
  sale_id    uuid references public.sales(id) on delete set null,
  notes      text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_sign check (
    (type in ('purchase', 'return', 'transfer_in') and quantity > 0)
    or (type in ('sale', 'waste', 'transfer_out') and quantity < 0)
    or type = 'adjustment'
  )
);
create index inventory_movements_idx on public.inventory_movements (product_id, branch_id, created_at desc);

-- ======================================================= COMISIONES ====
create table public.commission_periods (
  id         uuid primary key default gen_random_uuid(),
  starts_on  date not null,
  ends_on    date not null,
  status     public.commission_period_status not null default 'closed',
  closed_at  timestamptz not null default now(),
  closed_by  uuid references public.profiles(id) on delete set null,
  paid_at    timestamptz,
  constraint commission_periods_range check (starts_on <= ends_on),
  constraint commission_periods_no_overlap exclude using gist (daterange(starts_on, ends_on, '[]') with &&)
);

create table public.commission_statements (
  id                 uuid primary key default gen_random_uuid(),
  period_id          uuid not null references public.commission_periods(id) on delete cascade,
  barber_id          uuid not null references public.barbers(id),
  services_count     integer not null default 0,
  services_revenue   numeric(12,2) not null default 0,
  products_count     integer not null default 0,
  products_revenue   numeric(12,2) not null default 0,
  service_commission numeric(12,2) not null default 0,
  product_commission numeric(12,2) not null default 0,
  total_commission   numeric(12,2) not null default 0,
  unique (period_id, barber_id)
);

-- ========================================================== CORREOS ====
-- Bandeja de salida (patrón outbox): la base de datos encola, la Edge Function envía
create table public.email_outbox (
  id                  uuid primary key default gen_random_uuid(),
  template            text not null check (template in ('booking_confirmation', 'booking_reminder', 'booking_cancelled', 'booking_rescheduled')),
  to_email            extensions.citext not null,
  to_name             text,
  payload             jsonb not null default '{}'::jsonb,
  appointment_id      uuid references public.appointments(id) on delete cascade,
  status              public.email_status not null default 'pending',
  attempts            smallint not null default 0,
  last_error          text,
  scheduled_for       timestamptz not null default now(),
  sent_at             timestamptz,
  provider_message_id text,
  created_at          timestamptz not null default now()
);
create index email_outbox_pending_idx on public.email_outbox (scheduled_for) where status = 'pending';

-- ======================================================== AUDITORÍA ====
create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data   jsonb,
  new_data   jsonb,
  actor_id   uuid,
  created_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_time_idx   on public.audit_log (created_at desc);
