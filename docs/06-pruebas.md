# 6. Pruebas

`scripts/test/sql/01_seguridad_y_flujos.sql` contiene **82 pruebas** que simulan sesiones reales de Supabase (rol de Postgres + JWT) para cada tipo de usuario.

## Cómo correrlas

**Opción A · Con Supabase local (Docker)**

```bash
npm run db:start
npm run db:reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/test/sql/01_seguridad_y_flujos.sql
```

**Opción B · Con un Postgres 15+ cualquiera (sin Docker)**

`scripts/test/supabase_shim.sql` imita los esquemas `auth` y `storage` y los roles `anon`, `authenticated` y `service_role`. El script crea una base limpia, aplica las migraciones y los seeds, y corre las pruebas:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db
```

Si todo va bien, termina con `✔ Todas las pruebas pasaron`. Si una falla, el script se detiene y muestra `FALLÓ: <qué falló>`.

## Qué se prueba

| Bloque | Pruebas destacadas |
|---|---|
| Anónimo | Ve el catálogo y la disponibilidad; no ve clientes, citas, ventas, comisiones ni PIN; no puede reservar |
| Registro | Siempre crea rol cliente aunque se envíe `role: admin`; guarda la autorización de datos |
| Cliente | Solo ve lo suyo; no puede volverse admin ni escribir notas internas; reserva, reprograma y cancela; no puede reservar con menos de 60 min |
| Reservas | Un horario ocupado no se puede tomar dos veces; la base impide citas cruzadas incluso saltándose las funciones |
| Estados | Transiciones válidas; "no asistió" solo después de la hora; una cita terminada no vuelve atrás |
| Recepción | Kiosco de su sede; PIN incorrecto no rompe el conteo; venta con comisión del 55 % y 10 %; stock descontado; tope de descuento del 20 %; no opera otra sede |
| Personal desactivado | Pierde acceso a su sede, a la caja y al cobro |
| Barbero | Solo sus comisiones, su tarifa, sus ítems y sus clientes; no puede cambiarse de sede |
| Admin | Panel de ambas sedes; cierre de quincena; no se anula una venta de un periodo cerrado; anulación devuelve inventario y queda auditada |
| Sistema | Recordatorios sin duplicados; solo `service_role` toma correos de la bandeja; supresión de datos |

Durante el desarrollo estas pruebas detectaron y permitieron corregir dos errores reales: una regla de stock que bloqueaba las ventas de productos y una validación de permisos que, por la lógica de nulos de SQL, dejaba pasar a usuarios sin rol de personal.
