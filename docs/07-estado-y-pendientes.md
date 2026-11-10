# Estado del proyecto y pendientes

Última actualización: 9 de noviembre de 2026 (commit `ddc0b5d`, "Despliege Final filo y navaja").

## Dónde está cada cosa
- **Repositorio:** GitHub `JSRT23/filo-navaja`, rama `main`.
- **Supabase:** proyecto "Filo&Nav", id `kkdozbodhmrmbhlysypl`. Tiene aplicadas las 14 migraciones (la última es `20261109210000_correcciones_finales.sql`) y la Edge Function `process-email-outbox` en su versión 9.
- **Frontend:** https://filo-navaja.vercel.app
- **Pruebas:** `scripts/test/sql/01_seguridad_y_flujos.sql` (97 pruebas). Se corren con `scripts/test/run-local.sh` sobre un Postgres local.
- **Informe de cierre:** PDF en formato APA 7 y documento en línea. El PDF se genera desde un `informe.md` propio, fuera del repositorio.

## Secretos de las Edge Functions (viven solo en Supabase, nunca en el repositorio)
`RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ALLOWED_ORIGIN`. Sin `RESEND_API_KEY` los correos quedan como fallidos y se reintentan; `EMAIL_DRY_RUN=true` los simula.
`APP_URL` y `ALLOWED_ORIGIN` deben valer `https://filo-navaja.vercel.app`, sin `/` al final.

## Reglas que conviene recordar
- Recepción solo edita `internal_notes` de una cita por la API directa; el resto va por funciones RPC.
- Un cliente no puede tener dos citas que se crucen (`appointments_customer_no_overlap`).
- La asistencia solo se marca desde recepción o administración (kiosco).
- El público no ve cantidades de inventario, solo la vista `product_availability`.
- El descuento de una venta lo absorbe la barbería: la comisión se calcula sobre el precio completo.
- `VITE_DEMO_MODE` viene en `false`. Para mostrar las cuentas demo en el ingreso, construir con `true`.

## Pendientes y mejoras
- Cambiar la clave de Resend después de la demo.
- Verificar un dominio propio en Resend para enviar a cualquier cliente (hoy solo llegan al correo dueño de la cuenta).
- Activar "Confirm email" en Supabase Auth (requiere SMTP, por ejemplo el de Resend) para que el enlace con el historial de mostrador funcione.
- Desactivar las 15 cuentas de demostración antes de uso real.
- Pruebas unitarias del frontend y revisión por pull request (desviaciones declaradas en el informe).
- Si se actualiza el informe: revisar las cifras (14 migraciones, 97 pruebas, 50 políticas, 4 vistas).
