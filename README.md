# Filo & Navaja · Sistema de gestión para barbería

Sistema SGB-FN completo: **backend en Supabase** y **frontend en React + Vite + Tailwind** empaquetado con Docker. Reservas en línea, barberos y horarios, control de entradas y salidas con PIN, catálogo de cortes y productos, inventario por sede, caja, comisiones quincenales, panel de indicadores y correos automáticos.

**Arrancar el frontend en 2 minutos:** entra a [`frontend/`](frontend/README.md) y ejecuta `docker compose up --build` → http://localhost:8080 (o `npm install && npm run dev`).

> Proyecto de Gestión de TI · Electiva Específica IV · Universidad Cooperativa de Colombia
> Equipo: Juan Ramos Torralvo · Irwin Cardona · Juan Burgos

---

## Qué incluye

| Módulo | Lo que resuelve | Dónde vive |
|---|---|---|
| Sedes y horarios | Dos sedes, horario de apertura por día y días de cierre (festivos) | `branches`, `branch_hours`, `branch_closures` |
| Usuarios y roles | Admin, recepción, barbero y cliente, con permisos por fila (RLS) | `profiles`, Supabase Auth |
| Barberos | Ficha pública, servicios que presta, comisión y horario semanal | `barbers`, `barber_services`, `barber_compensation`, `barber_schedules` |
| Asistencia | Kiosco con PIN (bcrypt, bloqueo por intentos), reporte de horas, retrasos y ausencias | `register_attendance()`, `attendance_report()` |
| Catálogo | Cortes y servicios con duración y precio; productos con SKU y stock mínimo | `services`, `products` |
| Inventario | Existencias por sede movidas solo por movimientos auditables | `inventory_movements`, `product_stock` |
| Reservas | Disponibilidad real, reserva en línea, reprogramar, cancelar y estados; imposible reservar dos veces el mismo horario | `get_available_slots()`, `book_appointment()` |
| Caja y comisiones | Venta de servicios y productos, comisión congelada por ítem, cierre de quincena | `create_sale()`, `close_commission_period()` |
| Panel | Ingresos, ticket promedio, inasistencias, reservas en línea, servicios y barberos top | `dashboard_summary()` |
| Correos | Confirmación, recordatorio 24 h antes, cancelación y cambio de horario | `email_outbox` + Edge Function + pg_cron |
| Datos personales | Autorización (Ley 1581 de 2012) y derecho de supresión | `delete-my-account`, `anonymize_customer()` |

**Cifras del backend:** 26 tablas · 3 vistas · 49 políticas RLS · 25 funciones RPC para la app y 4 del sistema · 3 Edge Functions · 3 tareas programadas · 82 pruebas automáticas.

## Estructura

```
barberia-filo-navaja/
├── supabase/
│   ├── config.toml                 # Configuración local de Supabase CLI
│   ├── migrations/                 # Esquema versionado (13 migraciones, se aplican en orden)
│   │   ├── …_extensions_and_types.sql
│   │   ├── …_core_tables.sql
│   │   ├── …_helpers_and_triggers.sql
│   │   ├── …_rls_policies.sql
│   │   ├── …_rpc_booking.sql
│   │   ├── …_rpc_operations.sql
│   │   ├── …_rpc_reports.sql
│   │   ├── …_system_jobs.sql
│   │   ├── …_storage.sql
│   │   ├── …_scheduled_jobs.sql
│   │   ├── …_security_hardening.sql
│   │   ├── …_cron_secret_in_vault.sql
│   │   └── …_realtime_appointments.sql
│   ├── seeds/
│   │   ├── 01_catalogo.sql         # Sedes, servicios y productos (sirve en producción)
│   │   └── 02_demo.sql             # Usuarios y 14 días de historial (solo local)
│   └── functions/
│       ├── _shared/                # CORS, clientes de Supabase, plantillas de correo
│       ├── admin-create-staff/     # Alta de personal (solo admin)
│       ├── process-email-outbox/   # Envío de correos con Resend
│       └── delete-my-account/      # Supresión de datos del cliente
├── frontend/                       # Sitio web y panel (React + Vite + Tailwind + Docker)
├── scripts/test/                   # Pruebas automáticas de seguridad y flujos
└── docs/                           # Documentación técnica
```

## Proyecto de desarrollo en la nube

Ya está desplegado en Supabase (proyecto **Filo&Nav**, `kkdozbodhmrmbhlysypl`, us-east-1) con las 13 migraciones, el catálogo, los datos demo, las 3 Edge Functions y las 3 tareas programadas.

```
VITE_SUPABASE_URL=https://kkdozbodhmrmbhlysypl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_AS4gkph_9h5GLk71VGw9Jw_3VYSY7Fl
```

Para seguir trabajando sobre ese proyecto desde tu computador: `npx supabase link --project-ref kkdozbodhmrmbhlysypl`.

## Empezar en local (paso a paso)

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) y Node.js 20 o superior.

```bash
# 1. Instalar dependencias (Supabase CLI queda como dependencia del proyecto)
npm install

# 2. Levantar Supabase local: base de datos, Auth, Storage, Studio y Edge Functions
npm run db:start

# 3. Crear el esquema y cargar los datos demo
npm run db:reset

# 4. (Opcional) Servir las Edge Functions con sus secretos
cp supabase/functions/.env.example supabase/functions/.env
npm run functions:serve
```

Al terminar `db:start`, la terminal muestra la **API URL** y la **anon key** que usará el frontend. Studio queda en http://localhost:54323.

Usuarios demo (contraseña `FiloNavaja2026!`):

| Correo | Rol |
|---|---|
| admin@filoynavaja.co | Administrador |
| recepcion.castellana@filoynavaja.co | Recepción La Castellana |
| recepcion.centro@filoynavaja.co | Recepción Centro |
| jhon@filoynavaja.co | Barbero (PIN 3691) |
| cliente@ejemplo.com | Cliente |

Para subirlo a la nube, sigue [docs/05-despliegue.md](docs/05-despliegue.md).

## Documentación

1. [Arquitectura y trazabilidad con los requerimientos](docs/01-arquitectura.md)
2. [Modelo de datos](docs/02-modelo-de-datos.md)
3. [Seguridad: roles y RLS](docs/03-seguridad.md)
4. [Referencia de la API para el frontend](docs/04-api.md)
5. [Despliegue en Supabase Cloud](docs/05-despliegue.md)
6. [Pruebas](docs/06-pruebas.md)

## Frontend

Sitio público (inicio, servicios, barberos, productos, sedes, reserva en línea), cuenta del cliente y panel del personal por roles (resumen, agenda en vivo, caja, kiosco de asistencia, inventario, clientes, comisiones, catálogo, personal y configuración). Instrucciones completas en [frontend/README.md](frontend/README.md).
