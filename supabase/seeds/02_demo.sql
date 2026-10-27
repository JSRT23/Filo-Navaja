-- =====================================================================
-- 02_demo.sql · Datos de demostración (SOLO desarrollo local)
-- NUNCA lo ejecutes en producción: crea usuarios con contraseña conocida.
--
-- Usuarios demo (contraseña de todos: FiloNavaja2026!)
--   admin@filoynavaja.co                  Administrador (Andrés Rincón)
--   laura@filoynavaja.co                  Administradora (Laura Méndez)
--   recepcion.castellana@filoynavaja.co   Recepción La Castellana
--   recepcion.centro@filoynavaja.co       Recepción Centro
--   carlos@ … brayan@filoynavaja.co       Barberos (9)
--   cliente@ejemplo.com, sofia@ejemplo.com  Clientes
-- PIN de kiosco de cada barbero: al final del archivo
-- =====================================================================

-- Inventario inicial: entra por movimientos (así queda trazabilidad)
insert into public.inventory_movements (product_id, branch_id, type, quantity, unit_cost, notes)
select p.id, b.id, 'purchase',
       case when b.slug = 'la-castellana' then 18 else 12 end
       - case when p.sku in ('FN-PEI-001', 'FN-AFT-100') then 8 else 0 end,
       p.cost, 'Inventario inicial'
from public.products p cross join public.branches b;

-- ========================================================= USUARIOS ===
-- Crea un usuario de Auth con identidad de correo (lo que hace el registro real)
create or replace function pg_temp.create_demo_user(
  p_id uuid, p_email text, p_name text, p_phone text, p_role text default null, p_branch uuid default null
) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('FiloNavaja2026!', extensions.gen_salt('bf')), now(),
          jsonb_strip_nulls(jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                                               'role', p_role, 'branch_id', p_branch)),
          jsonb_build_object('full_name', p_name, 'phone', p_phone, 'data_consent', p_role is null),
          now(), now(), '', '', '', '');

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id::text, p_id,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000001', 'admin@filoynavaja.co', 'Andrés Rincón', '3001110001', 'admin');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000002', 'laura@filoynavaja.co', 'Laura Méndez', '3001110002', 'admin');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000003', 'recepcion.castellana@filoynavaja.co', 'Valentina Ortiz', '3001110003', 'receptionist', 'b1000000-0000-4000-8000-000000000001');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000004', 'recepcion.centro@filoynavaja.co', 'Daniela Pérez', '3001110004', 'receptionist', 'b1000000-0000-4000-8000-000000000002');

-- Barberos: 5 en La Castellana y 4 en Centro
select pg_temp.create_demo_user(u.id, u.email, u.name, u.phone, 'barber', u.branch)
from (values
  ('a2000000-0000-4000-8000-000000000001'::uuid, 'carlos@filoynavaja.co',    'Carlos Díaz',      '3002220001', 'b1000000-0000-4000-8000-000000000001'::uuid),
  ('a2000000-0000-4000-8000-000000000002'::uuid, 'jhon@filoynavaja.co',      'Jhon Mercado',     '3002220002', 'b1000000-0000-4000-8000-000000000001'::uuid),
  ('a2000000-0000-4000-8000-000000000003'::uuid, 'kevin@filoynavaja.co',     'Kevin Pacheco',    '3002220003', 'b1000000-0000-4000-8000-000000000001'::uuid),
  ('a2000000-0000-4000-8000-000000000004'::uuid, 'luis@filoynavaja.co',      'Luis Ortega',      '3002220004', 'b1000000-0000-4000-8000-000000000001'::uuid),
  ('a2000000-0000-4000-8000-000000000005'::uuid, 'sebastian@filoynavaja.co', 'Sebastián Doria',  '3002220005', 'b1000000-0000-4000-8000-000000000001'::uuid),
  ('a2000000-0000-4000-8000-000000000006'::uuid, 'miguel@filoynavaja.co',    'Miguel Hoyos',     '3002220006', 'b1000000-0000-4000-8000-000000000002'::uuid),
  ('a2000000-0000-4000-8000-000000000007'::uuid, 'yeison@filoynavaja.co',    'Yeison Martínez',  '3002220007', 'b1000000-0000-4000-8000-000000000002'::uuid),
  ('a2000000-0000-4000-8000-000000000008'::uuid, 'daniel@filoynavaja.co',    'Daniel Lora',      '3002220008', 'b1000000-0000-4000-8000-000000000002'::uuid),
  ('a2000000-0000-4000-8000-000000000009'::uuid, 'brayan@filoynavaja.co',    'Brayan Castro',    '3002220009', 'b1000000-0000-4000-8000-000000000002'::uuid)
) as u(id, email, name, phone, branch);

select pg_temp.create_demo_user('a3000000-0000-4000-8000-000000000001', 'cliente@ejemplo.com', 'Mateo Gómez', '3105550101');
select pg_temp.create_demo_user('a3000000-0000-4000-8000-000000000002', 'sofia@ejemplo.com',   'Sofía Arrieta', '3105550102');

-- ======================================================== BARBEROS ===
insert into public.barbers (id, profile_id, branch_id, display_name, bio, specialties, calendar_color, sort_order, hired_on) values
  ('ba000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Carlos Díaz',
   'Maestro barbero con 12 años de oficio. Especialista en cortes clásicos y afeitado a navaja.', '{Clásico,Afeitado,Barba}', '#C8A96A', 1, '2019-03-01'),
  ('ba000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'Jhon Mercado',
   'Rey del degradado. Transiciones limpias y contornos precisos.', '{Fade,Freestyle}', '#8E7CC3', 2, '2021-06-15'),
  ('ba000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'Kevin Pacheco',
   'Diseños freestyle y tendencias urbanas.', '{Freestyle,Fade,Tinte}', '#6FA8DC', 3, '2022-02-01'),
  ('ba000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000001', 'Luis Ortega',
   'Barba y cuidado facial. Ritual de toalla caliente.', '{Barba,Facial}', '#93C47D', 4, '2020-09-10'),
  ('ba000000-0000-4000-8000-000000000005', 'a2000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000001', 'Sebastián Doria',
   'Cortes para niños y caballeros. Paciencia y precisión.', '{Niños,Clásico}', '#F6B26B', 5, '2023-01-20'),
  ('ba000000-0000-4000-8000-000000000006', 'a2000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000002', 'Miguel Hoyos',
   'Líder de la sede Centro. Cortes ejecutivos y barba.', '{Clásico,Barba}', '#C8A96A', 1, '2019-08-05'),
  ('ba000000-0000-4000-8000-000000000007', 'a2000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000002', 'Yeison Martínez',
   'Fade, texturizados y estilos modernos.', '{Fade,Texturizado}', '#E06666', 2, '2022-05-02'),
  ('ba000000-0000-4000-8000-000000000008', 'a2000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-000000000002', 'Daniel Lora',
   'Afeitado clásico y tratamientos capilares.', '{Afeitado,Tratamientos}', '#76A5AF', 3, '2021-11-11'),
  ('ba000000-0000-4000-8000-000000000009', 'a2000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-000000000002', 'Brayan Castro',
   'Diseños a navaja y colorimetría.', '{Freestyle,Tinte}', '#B4A7D6', 4, '2024-02-12');

-- Cada barbero presta todos los servicios salvo excepciones
insert into public.barber_services (barber_id, service_id)
select b.id, s.id from public.barbers b cross join public.services s
where not (s.slug = 'corte-nino'       and b.display_name in ('Jhon Mercado', 'Brayan Castro'))
  and not (s.slug = 'diseno-freestyle' and b.display_name in ('Carlos Díaz', 'Luis Ortega', 'Daniel Lora'))
  and not (s.slug = 'tinte-de-barba'   and b.display_name not in ('Kevin Pacheco', 'Brayan Castro', 'Carlos Díaz', 'Miguel Hoyos'));

-- Horarios: 6 días por semana, almuerzo de 1 hora; cada barbero descansa un día distinto
insert into public.barber_schedules (barber_id, weekday, start_time, end_time, break_start, break_end)
select b.id, d,
       case when d = 0 then time '10:00' else time '09:00' end,
       case when d = 0 then time '16:00' else time '19:00' end,
       case when d = 0 then null else time '13:00' end,
       case when d = 0 then null else time '14:00' end
from public.barbers b
cross join generate_series(0, 6) d
where d <> (b.sort_order % 3) + 1           -- día de descanso: lunes, martes o miércoles
  and (d <> 0 or b.sort_order <= 2);        -- el domingo trabajan solo dos por sede

-- Algunos barberos tienen comisión diferente (negociada)
update public.barber_compensation set service_commission_rate = 60
where barber_id in ('ba000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000006');

-- PIN de kiosco (demo)
select public.set_barber_pin(id, pin) from (values
  ('ba000000-0000-4000-8000-000000000001'::uuid, '2580'), ('ba000000-0000-4000-8000-000000000002'::uuid, '3691'),
  ('ba000000-0000-4000-8000-000000000003'::uuid, '4725'), ('ba000000-0000-4000-8000-000000000004'::uuid, '5814'),
  ('ba000000-0000-4000-8000-000000000005'::uuid, '6937'), ('ba000000-0000-4000-8000-000000000006'::uuid, '7258'),
  ('ba000000-0000-4000-8000-000000000007'::uuid, '8146'), ('ba000000-0000-4000-8000-000000000008'::uuid, '9371'),
  ('ba000000-0000-4000-8000-000000000009'::uuid, '1593')
) as p(id, pin);

-- ============================================ HISTORIAL DE 14 DÍAS ===
-- Citas atendidas, ventas, inasistencias y marcaciones para que el panel
-- muestre datos reales desde el primer arranque.
do $$
declare
  v_tz      text := public.app_timezone();
  v_today   date := (now() at time zone v_tz)::date;
  v_day     date;
  v_b       record;
  v_sched   record;
  v_cust    uuid;
  v_service record;
  v_start   timestamptz;
  v_appt    uuid;
  v_sale    jsonb;
  v_slot    integer;
  v_prod    uuid;
  v_names   text[] := array['Juan Pablo Ruiz', 'Andrés Felipe Lugo', 'Camilo Negrete', 'Santiago Banquet', 'Esteban Paternina',
                            'Julián Hernández', 'Alejandro Vergara', 'Nicolás Espitia', 'David Montes', 'Felipe Sánchez',
                            'Samuel Arteaga', 'Tomás Villadiego', 'Óscar Ramos Ruiz', 'Ricardo Galeano', 'Mauricio Polo'];
  i integer;
begin
  perform setseed(0.42);

  -- Clientes de mostrador
  for i in 1 .. array_length(v_names, 1) loop
    perform public.staff_upsert_customer(v_names[i], '31' || lpad((20000000 + i * 7919)::text, 8, '0'),
                                         null, true, null);
  end loop;

  for v_day in select g::date from generate_series(v_today - 14, v_today - 1, interval '1 day') g loop
    for v_b in select * from public.barbers where is_active loop
      select * into v_sched from public.barber_schedules
      where barber_id = v_b.id and weekday = extract(dow from v_day)::smallint;
      continue when not found;

      -- Marcación de entrada (a veces tarde) y de salida
      insert into public.attendance_logs (barber_id, branch_id, type, recorded_at, source)
      values (v_b.id, v_b.branch_id, 'check_in',
              (v_day + v_sched.start_time + make_interval(mins => (random() * 20)::integer - 8)) at time zone v_tz, 'kiosk'),
             (v_b.id, v_b.branch_id, 'check_out',
              (v_day + v_sched.end_time + make_interval(mins => (random() * 15)::integer)) at time zone v_tz, 'kiosk');

      -- Entre 3 y 6 citas en la mañana y la tarde
      for v_slot in 0 .. (3 + (random() * 3)::integer) loop
        select s.* into v_service from public.services s
        join public.barber_services bs on bs.service_id = s.id and bs.barber_id = v_b.id
        where s.slug <> 'diseno-freestyle'
        order by random() limit 1;

        v_start := (v_day + v_sched.start_time + make_interval(mins => v_slot * 75)) at time zone v_tz;
        continue when (v_start at time zone v_tz)::time + make_interval(mins => v_service.duration_minutes) > v_sched.end_time;
        continue when v_sched.break_start is not null
                  and (v_start at time zone v_tz)::time < v_sched.break_end
                  and (v_start at time zone v_tz)::time + make_interval(mins => v_service.duration_minutes) > v_sched.break_start;

        select id into v_cust from public.customers where not is_anonymized order by random() limit 1;

        begin
          v_appt := public.staff_create_appointment(v_cust, v_b.id, v_service.id, v_start,
                      (array['reception', 'phone', 'walk_in'])[1 + (random() * 2)::integer]::public.appointment_source);
        exception when others then
          continue;
        end;
        update public.appointments set source = 'online' where id = v_appt and random() < 0.35;

        if random() < 0.12 then
          update public.appointments set status = 'no_show' where id = v_appt;
          continue;
        end if;

        -- Cobro: servicio y, a veces, un producto
        select id into v_prod from public.products order by random() limit 1;
        begin
          v_sale := public.create_sale(
            v_b.branch_id,
            (array['cash', 'cash', 'nequi', 'card', 'daviplata', 'transfer'])[1 + (random() * 5)::integer]::public.payment_method,
            case when random() < 0.3
                 then jsonb_build_array(jsonb_build_object('type', 'service', 'service_id', v_service.id),
                                        jsonb_build_object('type', 'product', 'product_id', v_prod, 'barber_id', v_b.id))
                 else jsonb_build_array(jsonb_build_object('type', 'service', 'service_id', v_service.id)) end,
            null, v_appt);
        exception when others then
          -- Si el producto se agotó, se cobra solo el servicio
          v_sale := public.create_sale(v_b.branch_id, 'cash',
                      jsonb_build_array(jsonb_build_object('type', 'service', 'service_id', v_service.id)), null, v_appt);
        end;
        update public.sales set created_at = v_start + make_interval(mins => v_service.duration_minutes)
        where id = (v_sale ->> 'sale_id')::uuid;
      end loop;
    end loop;
  end loop;

  -- Próximas citas del cliente demo
  select id into v_cust from public.customers where email = 'cliente@ejemplo.com';
  perform public.staff_create_appointment(v_cust, 'ba000000-0000-4000-8000-000000000002', '5e000000-0000-4000-8000-000000000008',
            ((v_today + 2) + time '10:00') at time zone v_tz, 'phone');
end $$;

-- Los correos generados por el seed no se envían
delete from public.email_outbox;

-- PIN de kiosco de los barberos demo:
--   Carlos 2580 · Jhon 3691 · Kevin 4725 · Luis 5814 · Sebastián 6937
--   Miguel 7258 · Yeison 8146 · Daniel 9371 · Brayan 1593
