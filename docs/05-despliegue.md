# 5. Despliegue en Supabase Cloud (paso a paso)

Tiempo estimado: 30 minutos. Necesitas una cuenta en [supabase.com](https://supabase.com) y Node.js 20+.

## Paso 1 · Crear el proyecto

1. Entra a https://supabase.com/dashboard → **New project**.
2. Nombre: `filo-navaja`. Región: la más cercana a Colombia (por ejemplo, *East US*).
3. Guarda la **contraseña de la base de datos** en un lugar seguro.
4. Cuando termine de crearse, ve a **Project Settings → General** y copia el **Reference ID** (algo como `abcdefghijklmnop`).

## Paso 2 · Conectar el repositorio con el proyecto

```bash
npm install
npx supabase login                       # abre el navegador para autorizar
npx supabase link --project-ref <REFERENCE_ID>
```

## Paso 3 · Habilitar extensiones de tareas programadas

Dashboard → **Database → Extensions** → busca y habilita **pg_cron** y **pg_net**.

> Hazlo antes del paso 4: la migración `…001000_scheduled_jobs.sql` crea las tareas solo si estas extensiones existen.

## Paso 4 · Crear el esquema

```bash
npm run db:push
```

Esto aplica las 12 migraciones en orden. Verifica en **Table Editor** que aparecen las tablas y en **Database → Cron Jobs** que hay 3 tareas.

## Paso 5 · Cargar el catálogo inicial

Abre **SQL Editor**, pega el contenido de `supabase/seeds/01_catalogo.sql` y ejecútalo. Luego ajusta direcciones, teléfonos y precios reales desde **Table Editor**.

> No ejecutes `02_demo.sql` en producción: crea usuarios con contraseña conocida.

## Paso 6 · Crear el primer administrador

1. **Authentication → Users → Add user → Create new user**: correo y contraseña del propietario, marca *Auto Confirm User*.
2. En **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'propietario@filoynavaja.co';
delete from public.customers where profile_id = (select id from public.profiles where email = 'propietario@filoynavaja.co');
```

Desde ese momento, el resto del personal (recepción y barberos) se crea desde la app con la Edge Function `admin-create-staff`.

## Paso 7 · Correo transaccional (Resend)

1. Crea una cuenta en https://resend.com y verifica tu dominio (registros DNS que te indica Resend).
2. Crea una **API key**.
## Paso 8 · Secretos de las Edge Functions

```bash
cp supabase/functions/.env.example supabase/functions/.env
# edita el archivo: RESEND_API_KEY, EMAIL_FROM, APP_URL y ALLOWED_ORIGIN
npm run secrets:push
```

## Paso 9 · Publicar las Edge Functions

```bash
npm run functions:deploy
```

`process-email-outbox` se publica con `--no-verify-jwt` porque la invoca el cron con su propio secreto.

## Paso 10 · Conectar el cron con la Edge Function

En **SQL Editor**, guarda en Vault la URL del proyecto y un secreto aleatorio generado por la propia base de datos (nadie necesita verlo ni copiarlo: la Edge Function lo valida con `verify_cron_secret()`):

```sql
select vault.create_secret('https://<REFERENCE_ID>.supabase.co', 'project_url');
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret');
```

Para probar el envío de inmediato desde el SQL Editor:

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-email-outbox',
  headers := jsonb_build_object('Content-Type', 'application/json',
             'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
  body := '{}'::jsonb);

select status_code, content from net._http_response order by id desc limit 1;
-- → 200 {"processed":…,"sent":…,"failed":0}
```

Sin `RESEND_API_KEY` la función trabaja en modo prueba: marca los correos como enviados con `provider_message_id = 'dry-run'` y los registra en los logs.

## Paso 11 · Configurar Auth

**Authentication → URL Configuration**

- *Site URL*: la URL del frontend (`https://filoynavaja.co`).
- *Redirect URLs*: `https://filoynavaja.co/**` y `http://localhost:5173/**`.

**Authentication → Providers → Email**: confirmación de correo activada. Opcional: personaliza las plantillas de Auth con la identidad de la barbería.

## Paso 12 · Llaves para el frontend

**Project Settings → API**: copia la *Project URL* y la *anon / publishable key*. Irán en el `.env` del frontend:

```
VITE_SUPABASE_URL=https://<REFERENCE_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Nunca uses la `service_role key` en el frontend.

## Verificación final

- [ ] **Advisors → Security** sin alertas críticas.
- [ ] Registrar un cliente de prueba desde la app y reservar una cita: llega el correo de confirmación.
- [ ] En **Database → Cron Jobs → process-email-outbox** las ejecuciones salen en verde.
- [ ] El plan **Pro** está activo para tener copias de seguridad diarias (RNF05).

## Cambios futuros al esquema

Nunca edites tablas a mano en producción. Crea una migración nueva:

```bash
npx supabase migration new nombre_del_cambio   # escribe el SQL en el archivo creado
npm run db:reset                                # pruébalo en local
npm run db:push                                 # súbelo a producción
```
