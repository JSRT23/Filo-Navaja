-- =====================================================================
-- Pruebas de seguridad (RLS) y de los flujos principales por rol.
-- Se ejecutan con scripts/test/run-local.sh sobre el seed de demo.
-- Cada bloque simula una sesión de Supabase: rol de Postgres + JWT.
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- ------------------------------------------------------ utilidades ---
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.login(p_email text) returns void
language plpgsql security definer as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'usuario % no existe', p_email; end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated', 'email', p_email)::text, true);
end $$;

create or replace function tests.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true)
$$;

create or replace function tests.ok(p_cond boolean, p_msg text) returns void
language plpgsql as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'FALLÓ: %', p_msg;
  end if;
  raise notice 'ok · %', p_msg;
end $$;

create or replace function tests.throws(p_sql text, p_fragment text, p_msg text) returns void
language plpgsql as $$
declare v_err text;
begin
  begin
    execute p_sql;
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err is null then
    raise exception 'FALLÓ (no lanzó error): %', p_msg;
  end if;
  if position(lower(p_fragment) in lower(v_err)) = 0 then
    raise exception 'FALLÓ: % · error inesperado: %', p_msg, v_err;
  end if;
  raise notice 'ok · % (error esperado: %)', p_msg, v_err;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Datos de referencia
select id as jhon   from public.barbers where display_name = 'Jhon Mercado' \gset
select id as carlos from public.barbers where display_name = 'Carlos Díaz' \gset
select id as miguel from public.barbers where display_name = 'Miguel Hoyos' \gset
select id as castellana from public.branches where slug = 'la-castellana' \gset
select id as centro     from public.branches where slug = 'centro' \gset
select id as combo  from public.services where slug = 'corte-y-barba' \gset
select id as pomada from public.products where sku = 'FN-POM-100' \gset

-- Primer horario libre de Jhon para "Corte + barba" entre 2 y 9 días adelante
select min(s.slot_start) as slot
from generate_series(2, 9) g
cross join lateral public.get_available_slots(:'jhon', :'combo', (now() at time zone 'America/Bogota')::date + g) s \gset

-- ================================================== 1. ANÓNIMO ===
begin;
select tests.as_anon();
set local role anon;
select tests.ok((select count(*) from public.services) >= 10, 'anon ve el catálogo de servicios');
select tests.ok((select count(*) from public.barbers) = 9, 'anon ve los 9 barberos activos');
select tests.ok((select count(*) from public.customers) = 0, 'anon no ve clientes');
select tests.ok((select count(*) from public.appointments) = 0, 'anon no ve citas');
select tests.ok((select count(*) from public.sales) = 0, 'anon no ve ventas');
select tests.ok((select count(*) from public.barber_compensation) = 0, 'anon no ve comisiones de barberos');
select tests.throws('select * from public.barber_credentials', 'permission denied', 'anon no puede leer los PIN');
select tests.throws('select * from public.email_outbox', 'permission denied', 'anon no puede leer la bandeja de correos');
select tests.ok((select count(*) from public.get_branch_availability(:'castellana', :'combo',
                 (now() at time zone 'America/Bogota')::date + 2)) > 0, 'anon consulta disponibilidad para reservar');
select tests.ok(not public.is_trusted_context(), 'anon no es contexto de confianza');
select tests.throws(format('select public.book_appointment(%L, %L, %L)', :'jhon', :'combo', :'slot'),
                    'permission denied', 'anon no puede reservar sin iniciar sesión');
rollback;

-- =========================================== 2. REGISTRO DE CLIENTE ===
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values ('a9000000-0000-4000-8000-000000000001', 'nuevo@ejemplo.com',
        '{"full_name":"Cliente Nuevo","phone":"310 555 0199","data_consent":true,"role":"admin"}',
        '{"provider":"email"}');
select tests.ok((select role from public.profiles where id = 'a9000000-0000-4000-8000-000000000001') = 'client',
                'el registro siempre crea rol cliente aunque el usuario intente enviar role=admin');
select tests.ok((select data_consent_at is not null and phone = '3105550199' from public.customers
                 where profile_id = 'a9000000-0000-4000-8000-000000000001'),
                'el registro crea la ficha de cliente con autorización de datos y teléfono normalizado');
rollback;

-- =================================================== 3. CLIENTE ===
begin;
select tests.login('cliente@ejemplo.com');
set local role authenticated;
select tests.ok((select count(*) from public.profiles) = 1, 'el cliente solo ve su propio perfil');
select tests.ok((select count(*) from public.customers) = 1, 'el cliente solo ve su propia ficha');
select tests.throws($$update public.profiles set role = 'admin' where id = auth.uid()$$,
                    'no tienes permiso', 'el cliente no puede volverse admin');
update public.profiles set full_name = 'Mateo Gómez R.' where id = auth.uid();
select tests.ok((select full_name from public.customers where profile_id = auth.uid()) = 'Mateo Gómez R.',
                'al editar su nombre se actualiza su ficha de cliente');
select tests.throws($$update public.customers set notes = 'VIP' where profile_id = auth.uid()$$,
                    'no tienes permiso', 'el cliente no puede escribir notas internas');
select tests.ok(not public.is_trusted_context(), 'un usuario autenticado no es contexto de confianza');
select tests.throws(format('select public.set_barber_pin(%L, %L)', :'jhon', '4826'),
                    'no autorizado', 'el cliente no puede cambiar el PIN de un barbero');
select tests.throws(format($$select public.create_sale(%L, 'cash', '[{"type":"service","service_id":"%s","barber_id":"%s"}]')$$,
                           :'castellana', :'combo', :'jhon'),
                    'no autorizado', 'el cliente no puede registrar ventas');
select tests.throws(format($$insert into public.inventory_movements (product_id, branch_id, type, quantity) values (%L, %L, 'purchase', 50)$$,
                           :'pomada', :'castellana'),
                    'row-level security', 'el cliente no puede mover inventario');
select tests.throws(format('select public.book_appointment(%L, %L, now() + interval ''20 minutes'')', :'jhon', :'combo'),
                    'no está disponible', 'no se puede reservar con menos de 60 minutos de anticipación');

-- Reserva en línea
select public.book_appointment(:'jhon', :'combo', :'slot', 'Fade bajo, por favor') as cita \gset
select tests.ok((select status = 'confirmed' and source = 'online' and price = 35000 from public.appointments where id = :'cita'),
                'la reserva queda confirmada, en línea y con el precio congelado');
select tests.ok((select count(*) from public.v_appointments where id = :'cita' and barber_name = 'Jhon Mercado') = 1,
                'la vista de citas muestra nombres respetando la RLS');
commit;

begin;
select tests.ok((select count(*) from public.email_outbox where appointment_id = :'cita' and template = 'booking_confirmation') = 1,
                'la reserva encola el correo de confirmación');
select tests.login('sofia@ejemplo.com');
set local role authenticated;
select tests.ok((select count(*) from public.appointments where id = :'cita') = 0, 'otra clienta no ve la cita de Mateo');
select tests.throws(format('select public.book_appointment(%L, %L, %L)', :'jhon', :'combo', :'slot'),
                    'no está disponible', 'nadie puede reservar un horario ya ocupado');
select tests.throws(format('select public.cancel_appointment(%L)', :'cita'),
                    'no autorizado', 'una clienta no puede cancelar la cita de otro');
rollback;

begin;
select tests.ok(not exists (select 1 from public.get_available_slots(:'jhon', :'combo', (:'slot'::timestamptz at time zone 'America/Bogota')::date) s
                            where s.slot_start = :'slot'), 'el horario reservado desaparece de la disponibilidad');
select tests.throws(format($$insert into public.appointments (branch_id, barber_id, customer_id, service_id, starts_at, ends_at, price)
                            select %L, %L, id, %L, %L::timestamptz + interval '15 minutes', %L::timestamptz + interval '45 minutes', 0
                            from public.customers limit 1$$, :'castellana', :'jhon', :'combo', :'slot', :'slot'),
                    'appointments_no_overlap', 'la base de datos impide citas cruzadas aunque se salten las funciones');
rollback;

begin;
select tests.login('cliente@ejemplo.com');
set local role authenticated;
select public.cancel_appointment(:'cita', 'Me salió un viaje');
select tests.ok((select status = 'cancelled' and cancelled_at is not null from public.appointments where id = :'cita'),
                'el cliente cancela su cita dentro de la ventana permitida');
commit;
select tests.ok((select count(*) from public.email_outbox where appointment_id = :'cita' and template = 'booking_cancelled') = 1,
                'la cancelación encola el correo de aviso');

-- ======================================= 3b. REPROGRAMAR Y ESTADOS ===
begin;
select tests.login('cliente@ejemplo.com');
set local role authenticated;
select tests.ok((select count(*) from public.get_available_dates(:'combo', :'castellana', :'jhon', 14)) >= 5,
                'el calendario muestra los días con cupo de Jhon');
select public.book_appointment(:'jhon', :'combo', :'slot') as cita2 \gset
select min(s.slot_start) as slot2 from generate_series(1, 6) g
cross join lateral public.get_available_slots(:'jhon', :'combo',
       (:'slot'::timestamptz at time zone 'America/Bogota')::date + g) s \gset
select public.reschedule_appointment(:'cita2', :'slot2');
select tests.ok((select starts_at = :'slot2'::timestamptz and ends_at = :'slot2'::timestamptz + interval '60 minutes'
                 from public.appointments where id = :'cita2'), 'el cliente reprograma su cita a otro horario libre');
select tests.throws(format('select public.set_appointment_status(%L, %L)', :'cita2', 'in_progress'),
                    'no autorizado', 'el cliente no cambia el estado de su cita');
select tests.login('jhon@filoynavaja.co');
select tests.throws(format('select public.set_appointment_status(%L, %L)', :'cita2', 'no_show'),
                    'después de la hora', 'no se marca "no asistió" antes de la hora de la cita');
select public.set_appointment_status(:'cita2', 'in_progress');
select public.set_appointment_status(:'cita2', 'completed');
select tests.ok((select status = 'completed' and checked_in_at is not null and completed_at is not null
                 from public.appointments where id = :'cita2'), 'el barbero pasa la cita a "en silla" y luego a "terminada"');
select tests.throws(format('select public.set_appointment_status(%L, %L)', :'cita2', 'in_progress'),
                    'no se puede pasar', 'una cita terminada no vuelve atrás');
rollback;

-- =========================================== 4. RECEPCIÓN (Castellana) ===
select quantity as stock_antes from public.product_stock where product_id = :'pomada' and branch_id = :'castellana' \gset

begin;
select tests.login('recepcion.castellana@filoynavaja.co');
set local role authenticated;
select tests.ok((select count(*) from public.get_kiosk_board(:'castellana')) = 5, 'el kiosco muestra los 5 barberos de la sede');
select tests.throws(format('select public.get_kiosk_board(%L)', :'centro'), 'no autorizado', 'recepción no ve el kiosco de otra sede');
select tests.ok((select (public.register_attendance(:'carlos', '0000') ->> 'ok')::boolean = false),
                'un PIN incorrecto se rechaza sin error');
select tests.throws('select * from public.barber_credentials', 'permission denied',
                    'recepción no puede leer los PIN (solo el sistema)');
select public.register_attendance(:'carlos', '2580') as marca \gset
select tests.ok((:'marca'::jsonb ->> 'ok')::boolean and :'marca'::jsonb ->> 'type' = 'check_in', 'el PIN correcto registra la entrada');
select tests.ok((public.register_attendance(:'carlos', '2580') ->> 'error') like '%hace un momento%',
                'no se permiten marcaciones duplicadas en el mismo minuto');
select tests.throws(format('select public.register_attendance(%L, %L)', :'miguel', '7258'),
                    'no está autorizado', 'recepción no marca asistencia de barberos de otra sede');

select public.create_sale(:'castellana', 'nequi',
  jsonb_build_array(jsonb_build_object('type', 'service', 'service_id', :'combo', 'barber_id', :'jhon'),
                    jsonb_build_object('type', 'product', 'product_id', :'pomada', 'barber_id', :'jhon'))) as venta \gset
select tests.ok((:'venta'::jsonb ->> 'total')::numeric = 80000, 'la venta suma servicio (35.000) y producto (45.000)');
select tests.ok((select commission_amount from public.sale_items
                 where sale_id = (:'venta'::jsonb ->> 'sale_id')::uuid and item_type = 'service') = 19250,
                'la comisión del servicio es el 55 % (19.250)');
select tests.ok((select commission_amount from public.sale_items
                 where sale_id = (:'venta'::jsonb ->> 'sale_id')::uuid and item_type = 'product') = 4500,
                'la comisión del producto es el 10 % (4.500)');
select tests.ok((select quantity from public.product_stock where product_id = :'pomada' and branch_id = :'castellana') = :stock_antes - 1,
                'vender un producto descuenta una unidad del inventario');
select tests.throws(format($$select public.create_sale(%L, 'cash', '[{"type":"service","service_id":"%s","barber_id":"%s"}]')$$,
                           :'centro', :'combo', :'miguel'),
                    'no autorizado', 'recepción no cobra en otra sede');
select tests.throws(format($$select public.create_sale(%L, 'cash', '[{"type":"service","service_id":"%s","barber_id":"%s"}]', null, null, 20000)$$,
                           :'castellana', :'combo', :'jhon'),
                    'máximo 20', 'recepción no puede dar más del 20 % de descuento');
select tests.throws(format($$select public.create_sale(%L, 'cash', '[{"type":"product","product_id":"%s","quantity":500}]')$$,
                           :'castellana', :'pomada'),
                    'stock insuficiente', 'no se vende más de lo que hay en inventario');
select tests.ok((select count(*) from public.appointments where branch_id = :'centro') = 0, 'recepción solo ve citas de su sede');
select tests.ok((public.dashboard_summary(current_date - 7, current_date) #>> '{range,branch_id}')::uuid = :'castellana',
                'el panel de recepción queda limitado a su sede');
select tests.ok((select count(*) from public.attendance_report(current_date - 7, current_date)) = 5,
                'el reporte de asistencia muestra los barberos de su sede');
select tests.throws(format('select public.void_sale(%L, %L)', :'venta'::jsonb ->> 'sale_id', 'error'),
                    'solo un administrador', 'recepción no puede anular ventas');
select tests.ok(public.adjust_stock(:'pomada', :'castellana', 10, 'Conteo físico') = 10, 'el ajuste por conteo deja el stock contado');
commit;

-- ============================== 4b. PERSONAL DESACTIVADO NO OPERA ===
begin;
update public.profiles set is_active = false where email = 'recepcion.castellana@filoynavaja.co';
select tests.login('recepcion.castellana@filoynavaja.co');
set local role authenticated;
select tests.ok(public.can_manage_branch(:'castellana') = false, 'un recepcionista desactivado pierde el acceso a su sede');
select tests.throws(format($$select public.create_sale(%L, 'cash', '[{"type":"service","service_id":"%s","barber_id":"%s"}]')$$,
                           :'castellana', :'combo', :'jhon'),
                    'no autorizado', 'un recepcionista desactivado no puede cobrar');
select tests.ok((select count(*) from public.sales) = 0, 'un recepcionista desactivado no ve la caja');
rollback;

-- =================================================== 5. BARBERO ===
insert into public.customers (full_name, phone) values ('Cliente Sin Citas', '3009990000');
begin;
select tests.login('jhon@filoynavaja.co');
set local role authenticated;
select tests.ok((select count(distinct barber_id) = 1 and bool_and(barber_id = :'jhon')
                 from public.commission_summary(current_date - 30, current_date)),
                'el barbero solo ve sus propias comisiones');
select tests.ok((select count(*) from public.commission_summary(current_date - 30, current_date, :'carlos') where barber_id = :'carlos') = 0,
                'el barbero no puede consultar las comisiones de otro');
select tests.ok((select service_commission_rate from public.barber_compensation) = 55
                and (select count(*) from public.barber_compensation) = 1, 'el barbero ve solo su tarifa de comisión');
update public.barbers set bio = 'Especialista en fades de alto contraste' where id = :'jhon';
select tests.throws(format('update public.barbers set branch_id = %L where id = %L', :'centro', :'jhon'),
                    'solo un administrador', 'el barbero no puede cambiarse de sede');
select tests.ok((select count(*) from public.sales) = 0, 'el barbero no ve la caja');
select tests.ok((select count(*) from public.sale_items) > 0 and (select bool_and(barber_id = :'jhon') from public.sale_items),
                'el barbero ve solo los ítems que él prestó');
select tests.ok((select count(*) from public.customers) >= 1
                and not exists (select 1 from public.customers where full_name = 'Cliente Sin Citas'),
                'el barbero solo ve los clientes que ha atendido');
select tests.throws('select public.dashboard_summary(current_date - 7, current_date)', 'no autorizado',
                    'el barbero no ve el panel gerencial');
commit;

-- ===================================================== 6. ADMIN ===
select starts_on as q_ini, ends_on as q_fin from public.get_fortnight((now() at time zone 'America/Bogota')::date - 14) \gset
select s.id as venta_vieja from public.sales s
where (s.created_at at time zone 'America/Bogota')::date between :'q_ini' and :'q_fin' and s.status = 'completed' limit 1 \gset

begin;
select tests.login('admin@filoynavaja.co');
set local role authenticated;
select tests.ok((public.dashboard_summary(current_date - 14, current_date) #>> '{revenue,total}')::numeric > 0,
                'el panel del admin muestra ingresos de ambas sedes');
select tests.ok(jsonb_array_length(public.dashboard_summary(current_date - 14, current_date) -> 'top_services') > 0,
                'el panel trae los servicios más vendidos');
select public.close_commission_period(:'q_ini', :'q_fin') as periodo \gset
select tests.ok((select count(*) from public.commission_statements where period_id = :'periodo') > 0,
                'cerrar la quincena congela el estado de cuenta de cada barbero');
select tests.throws(format('select public.close_commission_period(%L, %L)', :'q_ini', :'q_fin'),
                    'se cruza', 'no se puede cerrar dos veces la misma quincena');
select tests.throws(format('select public.void_sale(%L, %L)', :'venta_vieja', 'Error de digitación'),
                    'periodo de comisiones ya cerrado', 'no se anula una venta de un periodo cerrado');
select public.void_sale((:'venta'::jsonb ->> 'sale_id')::uuid, 'Cliente pagó dos veces');
select tests.ok((select status = 'voided' from public.sales where id = (:'venta'::jsonb ->> 'sale_id')::uuid),
                'el admin anula una venta reciente');
select tests.ok((select quantity from public.product_stock where product_id = :'pomada' and branch_id = :'castellana') = 11,
                'al anular, el producto vuelve al inventario');
select tests.ok((select count(*) from public.audit_log where table_name = 'sales' and action = 'UPDATE') > 0,
                'la anulación queda en la auditoría');
commit;

-- ========================================== 7. PROCESOS DEL SISTEMA ===
begin;
insert into public.appointments (branch_id, barber_id, customer_id, service_id, starts_at, ends_at, price, source)
select :'castellana', :'carlos', c.id, :'combo', now() + interval '20 hours', now() + interval '21 hours', 35000, 'phone'
from public.customers c where c.email = 'cliente@ejemplo.com';
select tests.ok(public.enqueue_appointment_reminders() >= 1, 'el cron encola recordatorios de las citas de mañana');
select tests.ok(public.enqueue_appointment_reminders() = 0, 'un recordatorio no se encola dos veces');
rollback;

begin;
select tests.login('admin@filoynavaja.co');
set local role authenticated;
select tests.throws('select * from public.claim_email_batch(5)', 'permission denied',
                    'ni siquiera un admin puede tomar correos de la bandeja (solo el sistema)');
rollback;

begin;
set local role service_role;
select tests.ok((select count(*) from public.claim_email_batch(5)) >= 1, 'service_role toma el lote de correos pendientes');
rollback;

begin;
select tests.login('admin@filoynavaja.co');
set local role authenticated;
select id as sofia from public.customers where email = 'sofia@ejemplo.com' \gset
select public.anonymize_customer(:'sofia');
select tests.ok((select is_anonymized and email is null and phone is null from public.customers where id = :'sofia'),
                'la supresión de datos borra la información personal y conserva el historial');
rollback;

\echo '✔ Todas las pruebas pasaron'
