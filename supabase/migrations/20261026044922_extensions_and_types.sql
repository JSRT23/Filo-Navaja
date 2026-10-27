-- =====================================================================
-- 0100 · Extensiones, tipos enumerados y configuración del negocio
-- Proyecto: SGB-FN · Sistema de gestión Barbería Filo & Navaja
-- =====================================================================

-- Extensiones (en Supabase viven en el esquema "extensions")
create extension if not exists pgcrypto   with schema extensions;  -- hash de PIN (crypt/bcrypt)
create extension if not exists btree_gist with schema extensions;  -- evita reservas cruzadas
create extension if not exists citext     with schema extensions;  -- correos sin distinguir mayúsculas

-- ---------------------------------------------------------------------
-- Tipos enumerados (valores en inglés; el frontend los traduce)
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'receptionist', 'barber', 'client');

create type public.appointment_status as enum (
  'pending',      -- creada, pendiente de confirmar
  'confirmed',    -- confirmada
  'in_progress',  -- el cliente está en la silla
  'completed',    -- servicio terminado
  'cancelled',    -- cancelada por cliente o recepción
  'no_show'       -- el cliente no llegó
);

create type public.appointment_source as enum ('online', 'reception', 'phone', 'walk_in');
create type public.attendance_type   as enum ('check_in', 'check_out');
create type public.attendance_source as enum ('kiosk', 'manual');
create type public.time_off_type     as enum ('leave', 'sick', 'vacation', 'other');

create type public.inventory_movement_type as enum (
  'purchase',      -- entrada de mercancía (+)
  'sale',          -- venta (−) · solo la genera el sistema
  'return',        -- devolución / anulación de venta (+)
  'adjustment',    -- ajuste por conteo físico (±)
  'waste',         -- merma, vencido o dañado (−)
  'transfer_in',   -- traslado recibido de otra sede (+)
  'transfer_out'   -- traslado enviado a otra sede (−)
);

create type public.payment_method as enum ('cash', 'card', 'transfer', 'nequi', 'daviplata');
create type public.sale_status as enum ('completed', 'voided');
create type public.sale_item_type as enum ('service', 'product');
create type public.commission_period_status as enum ('closed', 'paid');
create type public.email_status as enum ('pending', 'sending', 'sent', 'failed');

-- ---------------------------------------------------------------------
-- Configuración del negocio (reglas editables sin tocar código)
-- ---------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text not null,
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now()
);

comment on table public.app_settings is 'Reglas del negocio: tiempos de reserva, comisiones por defecto, tolerancias.';

insert into public.app_settings (key, value, description, is_public) values
  ('timezone',                         '"America/Bogota"', 'Zona horaria del negocio', true),
  ('slot_interval_minutes',            '15',  'Cada cuántos minutos se ofrecen horarios de reserva', true),
  ('min_booking_lead_minutes',         '60',  'Anticipación mínima para reservar en línea', true),
  ('max_booking_days_ahead',           '30',  'Días máximos hacia adelante para reservar', true),
  ('cancellation_window_minutes',      '120', 'El cliente puede cancelar o reprogramar hasta N minutos antes', true),
  ('reminder_hours_before',            '24',  'Horas antes de la cita en que se envía el recordatorio', true),
  ('max_active_bookings_per_customer', '3',   'Citas futuras activas que puede tener un cliente', true),
  ('late_tolerance_minutes',           '10',  'Tolerancia de llegada antes de contar retraso', false),
  ('default_service_commission_rate',  '55',  'Comisión por defecto del barbero sobre servicios (%)', false),
  ('default_product_commission_rate',  '10',  'Comisión por defecto del barbero sobre productos (%)', false),
  ('pin_max_attempts',                 '5',   'Intentos de PIN fallidos antes de bloquear', false),
  ('pin_lock_minutes',                 '15',  'Minutos de bloqueo del PIN', false),
  ('privacy_policy_version',           '"2026-10"', 'Versión vigente de la política de tratamiento de datos (Ley 1581 de 2012)', true);
