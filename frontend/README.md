# Filo & Navaja · Frontend

Sitio web y panel de gestión de la Barbería Filo & Navaja (Montería). React 18 + Vite 6 (JavaScript), Tailwind CSS 4, Supabase y Docker.

> Proyecto de Gestión de TI · Electiva Específica IV · Universidad Cooperativa de Colombia
> Equipo: Juan Ramos Torralvo, Irwin Cardona y Juan Burgos · Docente: Mariele Cogollo

---

## Arrancar

### Con Docker (recomendado)

```bash
docker compose up --build            # producción con Nginx → http://localhost:8080
```

No necesitas `.env`: el `docker-compose.yml` ya trae la URL y la llave pública del proyecto en la nube. Si quieres cambiarlas, copia `.env.example` a `.env` (en PowerShell: `Copy-Item .env.example .env`) y edítalo.

Para desarrollar con recarga en caliente dentro de Docker:

```bash
docker compose --profile dev up dev  # Vite → http://localhost:5173
```

### Sin Docker

Requiere Node.js 20 o superior.

```bash
cp .env.example .env                 # PowerShell: Copy-Item .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el build en http://localhost:4173 |
| `npm run lint` | Revisa el código con ESLint |
| `npm run format` | Da formato con Prettier |

### Ajustes en Supabase (una sola vez)

En el dashboard del proyecto, **Authentication → URL Configuration**:

- **Site URL:** la URL donde publiques el sitio (en local, `http://localhost:5173`).
- **Redirect URLs:** `http://localhost:5173/**`, `http://localhost:8080/**` y el dominio de producción.

Si quieres que los clientes entren apenas se registran, desactiva **Confirm email** en **Authentication → Providers → Email**. Si lo dejas activo, la app les pide confirmar el correo antes de ingresar.

## Cuentas de demostración

Contraseña de todas: `FiloNavaja2026!`. Con `VITE_DEMO_MODE=true` aparecen como accesos rápidos en la pantalla de ingreso.

| Correo | Rol | Qué ve |
|---|---|---|
| admin@filoynavaja.co | Administración | Todo el panel, las dos sedes |
| recepcion.castellana@filoynavaja.co | Recepción | Agenda, caja, kiosco, clientes, inventario y asistencia de su sede |
| recepcion.centro@filoynavaja.co | Recepción | Igual, sede Centro |
| carlos@filoynavaja.co | Barbero (PIN 2580) | Su agenda, sus comisiones, su asistencia y su perfil |
| miguel@filoynavaja.co | Barbero (PIN 7258) | Ídem, sede Centro |
| cliente@ejemplo.com | Cliente | Reservar, mis citas y mi perfil |

PIN del resto de barberos: Jhon 3691, Kevin 4725, Luis 5814, Sebastián 6937, Yeison 8146, Daniel 9371, Brayan 1593.

## Qué hay en cada pantalla

**Sitio público**

| Ruta | Contenido |
|---|---|
| `/` | Portada con el próximo turno libre de cada sede en vivo, la carta, la casa, los barberos, cómo reservar, productos y sedes |
| `/servicios` | Carta completa con precios y duración; cada servicio lleva directo a la reserva |
| `/barberos` | Equipo con filtros por sede y especialidad; ficha en ventana con horario y servicios |
| `/productos` | Línea de la casa con disponibilidad por sede |
| `/sedes` | Dirección, mapa, horario, cierres programados, quién atiende y cómo llegar |
| `/reservar` | Reserva en 5 pasos: sede, servicio, barbero, horario (solo horas libres reales) y confirmación. Se puede ingresar o registrarse sin perder lo elegido |
| `/privacidad` | Política de tratamiento de datos (Ley 1581 de 2012) |

**Cuenta del cliente**: `/mi-cuenta` (próximas citas, reprogramar, cancelar, agregar al calendario, historial) y `/mi-cuenta/perfil` (datos, foto, promociones, contraseña, eliminar cuenta).

**Panel del personal** (`/panel`)

| Pantalla | Admin | Recepción | Barbero |
|---|:-:|:-:|:-:|
| Resumen: ingresos, ventas, citas, inasistencia, medios de pago, top de servicios, barberos y productos | ✓ | su sede | |
| Agenda del día por barbero, en vivo, con cambio de estado, reprogramar, cancelar y nueva cita | ✓ | ✓ | la suya |
| Caja: cobrar citas y productos, descuentos, cambio, comprobante imprimible, anular venta | ✓ | ✓ (sin anular) | |
| Kiosco de asistencia (pantalla completa con PIN) | ✓ | ✓ | |
| Clientes: búsqueda, historial, preferencias, supresión de datos | ✓ | ✓ | |
| Inventario: existencias, entradas, conteos, mermas, traslados entre sedes, movimientos | ✓ | ✓ | |
| Asistencia: resumen del periodo y correcciones | ✓ | ✓ | la suya |
| Comisiones por quincena, cierre y pago | ✓ | | las suyas |
| Servicios, productos y categorías | ✓ | | |
| Personal: alta de usuarios, horario, servicios, comisión, PIN y novedades | ✓ | | |
| Configuración: reglas del negocio, sedes, horarios y cierres | ✓ | | |

Los permisos los decide la base de datos (RLS y funciones de Supabase); el frontend solo muestra lo que cada rol puede usar.

## Estructura

```
frontend/
├── Dockerfile               # dev (Vite) y prod (Nginx), multi-stage
├── docker-compose.yml       # servicios web (8080) y dev (5173)
├── nginx.conf               # SPA, gzip, caché y cabeceras de seguridad
├── index.html
├── vite.config.js
├── public/                  # favicon y robots.txt
└── src/
    ├── main.jsx             # React Query, router, autenticación, animaciones y avisos
    ├── App.jsx              # rutas (carga diferida por página) y protección por rol
    ├── styles/index.css     # tokens de diseño de Tailwind 4 (@theme)
    ├── lib/                 # cliente Supabase, formatos de Colombia, horarios, errores
    ├── api/                 # consultas y mutaciones (catálogo, reservas, panel, admin)
    ├── features/            # autenticación, reserva, clientes, contexto del panel
    ├── components/
    │   ├── ui/              # botón, campos, modal, cajón lateral, menú, insignias…
    │   ├── brand/           # logo, ilustraciones de producto, íconos de redes
    │   ├── site/            # piezas del sitio público
    │   ├── panel/           # piezas del panel (encabezados, indicadores, tablas)
    │   └── layout/          # plantillas pública, de ingreso y del panel
    └── pages/               # public, auth, account, panel y kiosk
```

## Diseño

- **Paleta:** cordobán `#2B1416` (el cuero de las sillas), hueso `#EDE5D8` (las toallas), latón `#B8925A` (los herrajes), acero `#8E9AA0` (la navaja), verde Sinú `#2F5D50` (el río de Montería) y rojo del poste `#B23A3A`, usado solo para alertas.
- **Tipografía:** Archivo variable. El eje de ancho condensado (62 %) da la voz de la marca en títulos; el cuerpo usa el ancho normal.
- **Movimiento:** una entrada orquestada en la portada, transiciones entre pasos de la reserva, ventanas y confirmaciones. Respeta «reducir movimiento» del sistema.
- **Accesibilidad:** foco visible, navegación con teclado, etiquetas en controles, contraste AA y diseño desde 360 px de ancho.
- **Gráficas:** un solo color de datos validado (croma y contraste ≥ 3:1), barras delgadas y valores en tinta.

Las fotos son de Unsplash (licencia libre) y se cargan desde su CDN; los créditos están en el pie de página. Las fotos de barberos, productos y avatares que suba el equipo quedan en Supabase Storage.

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Llave pública (publishable/anon). Nunca la `service_role` |
| `VITE_ENABLE_REALTIME` | `true` para que la agenda se actualice sola |
| `VITE_DEMO_MODE` | `true` muestra las cuentas demo en el ingreso; en producción real, `false` |

## Publicar

El build es estático: sirve `dist/` en cualquier hosting (la imagen de Docker con Nginx, Vercel, Netlify o Cloudflare Pages). En hostings distintos a Nginx configura la regla de SPA: toda ruta desconocida responde `index.html`.
