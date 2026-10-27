# 3. Seguridad

## Principios

1. **RLS en todas las tablas.** Ninguna tabla de `public` queda abierta. El catálogo (sedes, servicios, barberos activos, productos) es público; lo operativo solo lo ve quien lo necesita.
2. **Mínimo privilegio por sede.** Recepción solo opera su sede. El admin opera ambas.
3. **El rol no viaja desde el cliente.** Registrarse siempre crea un `client`. El rol de personal se asigna con `app_metadata`, que solo puede escribir el `service_role` (Edge Function `admin-create-staff`). Un trigger impide que un usuario cambie su rol, su sede o su estado.
4. **Funciones blindadas.** Todas las funciones `security definer` usan `set search_path = ''` y nombres calificados (`public.tabla`), validan permisos al inicio y tienen `execute` revocado para `anon` cuando no aplica.
5. **Contexto de confianza explícito.** `is_trusted_context()` solo es verdadero en migraciones, SQL Editor, pg_cron o `service_role`. Nunca para peticiones de la app.
6. **Lógica de nulos segura.** Los permisos que comparan identificadores usan `coalesce(…, false)`: un usuario sin ficha de barbero o un recepcionista desactivado nunca pasa una validación por accidente (las pruebas incluyen ambos casos).

## Matriz de permisos

| Recurso | Anónimo | Cliente | Barbero | Recepción | Admin |
|---|---|---|---|---|---|
| Sedes, servicios, productos, barberos activos, horarios | Ver | Ver | Ver | Ver | Gestionar |
| Disponibilidad para reservar | Ver | Ver | Ver | Ver | Ver |
| Perfil propio | — | Ver y editar (sin rol) | Ver y editar | Ver y editar | Todos |
| Clientes | — | Solo su ficha | Los que ha atendido | Todos | Todos |
| Citas | — | Las suyas | Las suyas | Las de su sede | Todas |
| Reservar en línea | — | Sí | — | — | — |
| Agendar por recepción | — | — | — | Su sede | Todas |
| Cambiar estado de cita | — | — | Las suyas | Su sede | Todas |
| Kiosco y marcación | — | — | Él mismo | Su sede | Todas |
| Caja (ventas) | — | — | Solo sus ítems | Su sede, ≤ 20 % de descuento | Todas, anular |
| Inventario | Existencias | Existencias | Ver movimientos | Entradas y ajustes de su sede | Todo, traslados |
| Comisiones | — | — | Las suyas | — | Todas, cerrar quincena |
| Panel de indicadores | — | — | — | Su sede | Ambas sedes |
| PIN, bandeja de correos | — | — | — | — | Solo el sistema |
| Auditoría | — | — | — | — | Ver |

## Kiosco de asistencia

- El PIN se guarda con **bcrypt** (`pgcrypto`, costo 8) en `barber_credentials`, tabla sin privilegios para `anon` ni `authenticated`.
- Se rechazan PIN triviales (`1111`, `1234`, `9876`).
- Tras **5 intentos fallidos** el PIN se bloquea **15 minutos** (configurable). `register_attendance()` devuelve un JSON `{ ok: false, error }` en vez de lanzar error para que el conteo de intentos quede guardado.
- Se impide marcar dos veces en el mismo minuto y se alterna entrada/salida automáticamente.
- La tablet inicia sesión con la cuenta de recepción de la sede; solo puede marcar a los barberos de esa sede.

## Datos personales (Ley 1581 de 2012)

- El registro guarda `data_consent_at` y la versión de la política (`privacy_policy_version`). Sin autorización no se puede reservar.
- El cliente puede editar sus datos y retirar la autorización.
- **Supresión:** `delete-my-account` anonimiza la ficha (nombre, teléfono, correo, notas), cancela sus citas futuras, borra su foto y su usuario. Las ventas se conservan como "Cliente anónimo" porque son soporte contable.
- El registro de entradas y salidas se presenta como **disponibilidad de silla**, coherente con el modelo de barberos por comisión (sección 4.4 de la Fase 1).

## Auditoría

`audit_log` guarda el antes y el después de cada cambio en perfiles, barberos, comisiones, servicios, productos, citas, ventas, asistencia y periodos de comisión, con el usuario que lo hizo. Solo el admin la consulta.

## Recomendaciones para producción

- Activar **Leaked password protection** y **MFA** para las cuentas admin (Dashboard → Authentication).
- Restringir `ALLOWED_ORIGIN` de las Edge Functions al dominio del frontend.
- Revisar **Advisors → Security** del Dashboard después de cada migración.
- Nunca exponer la `service_role key` en el frontend: solo la `anon key` (o la nueva *publishable key*).
