# 4. Referencia de la API para el frontend

El frontend usa `@supabase/supabase-js` con la **anon key**. Las lecturas van a tablas y vistas (la RLS filtra) y las operaciones de negocio a funciones RPC.

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

**Errores:** todas las funciones lanzan mensajes en español listos para mostrar (`error.message`), por ejemplo *"Ese horario ya no está disponible. Elige otro"*. Los códigos más usados: `42501` sin permiso, `P0001` regla del negocio, `P0002` no encontrado, `22023` dato inválido.

**Fechas:** se envían y reciben en ISO 8601 con zona (`2026-10-29T10:00:00-05:00`). Para mostrarlas usa `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })`.

---

## Autenticación

```js
// Registro de cliente: data_consent es obligatorio para poder reservar (Ley 1581)
await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: 'Mateo Gómez', phone: '3105550101', data_consent: true } },
});

await supabase.auth.signInWithPassword({ email, password });

// Perfil y rol del usuario actual
const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
// profile.role → 'admin' | 'receptionist' | 'barber' | 'client'
```

## Catálogo público

```js
// Sedes con su horario
supabase.from('branches').select('*, branch_hours(*)').order('name');

// Servicios por categoría
supabase.from('service_categories')
  .select('id, name, slug, services(id, name, slug, description, duration_minutes, price, image_url, is_featured)')
  .order('sort_order');

// Barberos de una sede con los servicios que prestan
supabase.from('barbers')
  .select('id, display_name, bio, specialties, photo_url, instagram, barber_services(service_id)')
  .eq('branch_id', branchId).order('sort_order');

// Productos con existencias por sede
supabase.from('products').select('*, product_stock(branch_id, quantity)').eq('is_active', true);

// Reglas públicas (anticipación, ventana de cancelación…)
supabase.from('app_settings').select('key, value');
```

## Reservas

| Función | Quién | Devuelve |
|---|---|---|
| `get_available_dates(p_service_id, p_branch_id, p_barber_id?, p_days?)` | Todos | `[{ available_on, slots_count }]` para pintar el calendario |
| `get_branch_availability(p_branch_id, p_service_id, p_date)` | Todos | `[{ barber_id, barber_name, photo_url, slot_start, slot_end }]` |
| `get_available_slots(p_barber_id, p_service_id, p_date)` | Todos | `[{ slot_start, slot_end }]` |
| `book_appointment(p_barber_id, p_service_id, p_starts_at, p_customer_notes?)` | Cliente | `uuid` de la cita |
| `reschedule_appointment(p_appointment_id, p_new_starts_at, p_new_barber_id?)` | Cliente (hasta 2 h antes) o recepción | `uuid` |
| `cancel_appointment(p_appointment_id, p_reason?)` | Cliente (hasta 2 h antes) o recepción | — |
| `set_appointment_status(p_appointment_id, p_status)` | Barbero de la cita o recepción | — |
| `staff_upsert_customer(p_full_name, p_phone?, p_email?, p_data_consent?, p_notes?)` | Recepción | `uuid` del cliente (lo encuentra por teléfono o correo, o lo crea) |
| `staff_create_appointment(p_customer_id, p_barber_id, p_service_id, p_starts_at, p_source?, p_internal_notes?)` | Recepción | `uuid`; `p_source`: `reception`, `phone`, `walk_in` |

```js
// Flujo de reserva del cliente
const { data: days } = await supabase.rpc('get_available_dates', {
  p_service_id: serviceId, p_branch_id: branchId, p_days: 14,
});

const { data: slots } = await supabase.rpc('get_branch_availability', {
  p_branch_id: branchId, p_service_id: serviceId, p_date: '2026-10-29',
});

const { data: appointmentId, error } = await supabase.rpc('book_appointment', {
  p_barber_id: slot.barber_id,
  p_service_id: serviceId,
  p_starts_at: slot.slot_start,
  p_customer_notes: 'Fade bajo, por favor',
});
if (error) toast.error(error.message);

// Mis citas
supabase.from('v_appointments').select('*')
  .gte('starts_at', new Date().toISOString()).order('starts_at');

// Agenda del día de la sede (recepción) o del barbero
supabase.from('v_appointments').select('*')
  .eq('local_date', '2026-10-29').order('starts_at');
```

Para ver la agenda en tiempo real, suscríbete a la tabla `appointments` con Realtime (la RLS también aplica):

```js
supabase.channel('agenda')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refetch)
  .subscribe();
```

> Habilita Realtime para `appointments` en Dashboard → Database → Publications si lo vas a usar.

## Kiosco de asistencia

| Función | Quién | Devuelve |
|---|---|---|
| `get_kiosk_board(p_branch_id)` | Recepción | Barberos de la sede, si tienen PIN, estado de hoy (`in`, `out`, `not_arrived`) y horario |
| `register_attendance(p_barber_id, p_pin)` | Recepción (tablet) o el propio barbero | `{ ok, type, recorded_at, barber_name, is_late }` o `{ ok: false, error, attempts_left? }` |
| `record_attendance_manual(p_barber_id, p_type, p_recorded_at, p_notes)` | Recepción o admin | `uuid`; exige motivo |
| `set_barber_pin(p_barber_id, p_pin)` | Recepción o admin | — |

```js
const { data } = await supabase.rpc('register_attendance', { p_barber_id: id, p_pin: pin });
if (!data.ok) return showError(data.error);
showSuccess(`${data.type === 'check_in' ? 'Entrada' : 'Salida'} registrada · ${data.barber_name}`);
```

## Caja e inventario

| Función | Quién | Devuelve |
|---|---|---|
| `create_sale(p_branch_id, p_payment_method, p_items, p_customer_id?, p_appointment_id?, p_discount?, p_notes?)` | Recepción o admin | `{ sale_id, number, subtotal, discount, total }` |
| `void_sale(p_sale_id, p_reason)` | Admin | — (devuelve los productos al inventario) |
| `register_stock_entry(p_product_id, p_branch_id, p_quantity, p_unit_cost?, p_notes?)` | Recepción o admin | Existencia nueva |
| `adjust_stock(p_product_id, p_branch_id, p_counted_quantity, p_reason)` | Recepción o admin | Existencia contada |
| `transfer_stock(p_product_id, p_from_branch_id, p_to_branch_id, p_quantity, p_notes?)` | Admin | — |

Medios de pago: `cash`, `card`, `transfer`, `nequi`, `daviplata`.

```js
// Cobrar una cita con un producto adicional
const { data: sale, error } = await supabase.rpc('create_sale', {
  p_branch_id: branchId,
  p_payment_method: 'nequi',
  p_appointment_id: appointmentId,          // toma el cliente, el barbero y el precio de la cita
  p_items: [
    { type: 'service', service_id: serviceId },
    { type: 'product', product_id: pomadaId, quantity: 1, barber_id: barberId },
  ],
  p_discount: 0,
});

// Productos por agotarse
supabase.from('v_low_stock').select('*').eq('branch_id', branchId);

// Exportar ventas del mes a CSV
supabase.from('v_sales_export').select('*')
  .gte('created_at', '2026-10-01').lt('created_at', '2026-11-01')
  .csv();
```

## Comisiones, reportes y panel

| Función | Quién | Devuelve |
|---|---|---|
| `get_fortnight(p_date?)` | Todos | `{ starts_on, ends_on }` de la quincena (1–15 o 16–fin de mes) |
| `commission_summary(p_from, p_to, p_barber_id?)` | Admin (todos) o barbero (solo lo suyo) | Por barbero: servicios, productos, comisión |
| `close_commission_period(p_starts_on, p_ends_on)` | Admin | `uuid` del periodo; congela los estados de cuenta |
| `mark_commission_period_paid(p_period_id)` | Admin | — |
| `attendance_report(p_from, p_to, p_branch_id?)` | Admin, recepción (su sede) o barbero (lo suyo) | Días programados, trabajados, ausencias, retrasos y minutos |
| `dashboard_summary(p_from, p_to, p_branch_id?)` | Admin o recepción (su sede) | JSON con ingresos, citas, tops y ventas por día |

```js
const { data: q } = await supabase.rpc('get_fortnight');
const { data: mine } = await supabase.rpc('commission_summary', { p_from: q[0].starts_on, p_to: q[0].ends_on });

const { data: kpis } = await supabase.rpc('dashboard_summary', { p_from: '2026-10-01', p_to: '2026-10-31' });
// kpis.revenue.total, kpis.revenue.average_ticket, kpis.appointments.no_show_rate,
// kpis.appointments.online_share, kpis.top_services, kpis.top_barbers, kpis.daily_revenue
```

## Edge Functions

```js
// Crear un barbero (solo admin)
await supabase.functions.invoke('admin-create-staff', {
  body: {
    email: 'nuevo@filoynavaja.co', password: 'Temporal2026!', full_name: 'Andrés Lugo',
    role: 'barber', branch_id: branchId,
    barber: { bio: 'Especialista en fade', specialties: ['Fade'], pin: '4826' },
  },
});

// El cliente elimina su cuenta (derecho de supresión)
await supabase.functions.invoke('delete-my-account', { body: { confirm: 'ELIMINAR' } });
```

## Imágenes (Storage)

| Bucket | Ruta | Quién sube |
|---|---|---|
| `avatars` | `<user_id>/avatar.webp` | Cada usuario, solo en su carpeta |
| `barbers` | `<barber_id>/foto.webp` | Admin o el propio barbero |
| `catalog` | `services/<slug>.webp`, `products/<sku>.webp`, `branches/<slug>.webp` | Admin |

```js
const path = `${user.id}/avatar.webp`;
await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: 'image/webp' });
const { data } = supabase.storage.from('avatars').getPublicUrl(path);
await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
```
