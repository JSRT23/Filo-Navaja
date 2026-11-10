# Informe de Cierre del Proyecto · Barbería Filo & Navaja

Universidad Cooperativa de Colombia · Electiva Específica IV · Docente Mariele Cogollo

Equipo: Juan Ramos Torralvo, Irwin Cardona, Juan Burgos

Nov 9, 2026 · @Juan Ramos

## 1. Introducción

Este informe cierra el proyecto "Sistema web de gestión integral para Barbería Filo & Navaja" (SGB-FN) y demuestra, con cifras y evidencias, que se entregó lo que el acta de constitución y el plan de la Fase 2 prometieron.

Barbería Filo & Navaja opera dos sedes en Montería (La Castellana, con 5 sillas, y Centro, con 4), nueve barberos y cerca de 2.000 servicios al mes. Antes del proyecto, las citas se anotaban en un cuaderno, los horarios se acordaban de palabra, el inventario vivía en Excel y las comisiones se calculaban a mano. El resultado eran un 18 % de inasistencias, 12 horas administrativas por semana y ninguna base de datos para decidir una tercera sede.

El documento sigue la estructura de cierre de la Guía del PMBOK y recoge los 15 entregables exigidos por el curso. Cada uno tiene su propia sección, y las cifras de costos, gastos e ingresos se contrastan con precios de mercado consultados en fuentes públicas (sección 7 y Anexo de fuentes).

## 2. Resumen ejecutivo

SGB-FN se entregó completo con un costo final de COP 18.550.486, un 9,4 % por debajo de los COP 20.482.000 aprobados, y el producto estuvo listo para piloto 44 días antes de lo planeado.

| Indicador | Plan (Fases 1 y 2) | Cierre |
| --- | --- | --- |
| Alcance | 16 RF y 7 RNF, 8 módulos | 16 de 16 RF entregados; de los 7 RNF, 4 verificados, 2 se miden en producción y 1 con desviación |
| Calidad | 0 defectos críticos; 0 accesos indebidos entre roles | 97 de 97 pruebas automáticas aprobadas; 0 defectos críticos abiertos |
| Cronograma | Producto listo para piloto el 18 dic 2026 (H2) | Listo el 4 nov 2026; salida a producción el 25 ene 2027 sin cambio |
| Costo | COP 20.482.000 con 10 % de contingencia | COP 18.550.486; contingencia sin usar |
| Beneficio mensual esperado | COP 1.831.000 | COP 1.831.000, recalculado con precios de Montería |
| ROI del año 1 | 7 % | 18,4 % |
| Recuperación de la inversión | ≈ 11 meses | ≈ 10,1 meses |

El ahorro viene de dos fuentes: la reserva de contingencia de COP 1.862.000 no se usó, y el dólar está en COP 3.228 (TRM del 6 de noviembre de 2026) frente a los COP 4.000 que supuso el plan para Supabase.

**Cómo leer las cifras.** Cada dato de este informe pertenece a una de tres clases:

- **Verificado:** sale del repositorio, de las migraciones, de las pruebas o de la base de datos del proyecto.
- **Referencia de mercado:** sale de una fuente pública consultada el 9 de noviembre de 2026 y está citada en el Anexo de fuentes.
- **Ilustrativo:** representa algo que, según el plan, ocurre en enero de 2027 (piloto, capacitación, encuesta, firmas). Es un valor del caso de estudio y está rotulado; debe sustituirse por el dato real al obtenerlo.

## 3. Acta formal de cierre del proyecto

Con esta acta el patrocinador declara terminado el proyecto SGB-FN, acepta los entregables descritos en este informe y libera al equipo de nuevas obligaciones de desarrollo, salvo el soporte posterior ya contratado.

| Campo | Contenido |
| --- | --- |
| Nombre del proyecto | Sistema web de gestión integral para Barbería Filo & Navaja (SGB-FN) |
| Organización | Barbería Filo & Navaja, Montería (sedes La Castellana y Centro) |
| Patrocinador | Andrés Rincón, propietario |
| Director del proyecto | Juan Ramos Torralvo |
| Equipo | Irwin Cardona (backend e infraestructura) y Juan Burgos (frontend y UX/UI) |
| Dueña del proceso | Laura Méndez, administradora |
| Fecha de inicio | 13 de octubre de 2026 |
| Fecha de finalización | 29 de enero de 2027 (hito de cierre del plan) |
| Alcance ejecutado | 8 módulos, 16 requerimientos funcionales y 7 no funcionales (uno con desviación pendiente de aceptación, sección 5); capacitación del personal, manuales y soporte de 3 meses |
| Exclusiones respetadas | Facturación electrónica, pagos en línea, nómina, app nativa, API de WhatsApp y fidelización |
| Presupuesto aprobado | COP 20.482.000 |
| Costo final | COP 18.550.486 |
| Compromisos posteriores | Soporte hasta el 23 de abril de 2027; costo recurrente de ≈ COP 1,2 millones al año |

### Objetivos alcanzados

| Objetivo específico (Fase 1) | Resultado al cierre | Evidencia |
| --- | --- | --- |
| 1. Registrar el 100 % de los barberos con perfil, sede, especialidades y horario | Cumplido: los 9 barberos y las 2 sedes están cargados con horario semanal | Tablas `barbers`, `barber_schedules`; Edge Function `admin-create-staff` |
| 2. Controlar entradas y salidas con PIN | Cumplido: kiosco por sede, PIN con bcrypt y bloqueo por intentos, reporte de horas, retrasos y ausencias | `register_attendance()`, `attendance_report()` |
| 3. Catálogo con foto, duración y precio único | Cumplido: precio único para ambas sedes y fotos reales con licencia libre | `services`, bucket `catalog` |
| 4. Inventario por sede con alertas y ventas | Cumplido: el stock solo se mueve por movimientos auditables y avisa al llegar al mínimo | `inventory_movements`, vista `v_low_stock` |
| 5. Reservas 24/7 con recordatorio, para bajar inasistencias del 18 % al 8 % | Herramienta entregada; la meta se mide a los 6 meses (jul 2027) | `book_appointment()`, `email_outbox`, `appointments_no_overlap` |
| 6. Comisiones automáticas, de 12 a 4 horas administrativas por semana | Herramienta entregada; la meta se mide al mes 2 (mar 2027) | `create_sale()`, `close_commission_period()` |
| 7. Cumplir la Ley 1581 de 2012 | Cumplido: autorización versionada, supresión con anonimización y RLS en las 26 tablas | `delete-my-account`, `anonymize_customer()`, 50 políticas RLS |

Los objetivos 5 y 6 dependen de hábitos del personal y de los clientes, así que el proyecto entrega la capacidad y los indicadores de beneficio (sección 4) los siguen después del cierre.

### Aceptación y firmas

El patrocinador acepta formalmente el sistema en producción en ambas sedes, los manuales y la capacitación, según los criterios de aceptación de la Tabla 4 de la Fase 2.

| Rol | Nombre | Firma | Fecha |
| --- | --- | --- | --- |
| Patrocinador | Andrés Rincón | Firmado | 29/01/2027 |
| Dueña del proceso | Laura Méndez | Firmado | 29/01/2027 |
| Director del proyecto | Juan Ramos Torralvo | Firmado | 29/01/2027 |
| Desarrollador backend | Irwin Cardona | Firmado | 29/01/2027 |
| Desarrollador frontend | Juan Burgos | Firmado | 29/01/2027 |

## 4. Resultados del proyecto

El proyecto entregó un sistema en producción para las dos sedes con 26 tablas, 50 políticas de seguridad por fila, 33 funciones de negocio, 3 Edge Functions y 3 tareas programadas, y superó todas las metas de calidad que se pueden medir antes de operar.

### Qué se construyó

| Componente | Resultado (verificado en el repositorio) |
| --- | --- |
| Base de datos y seguridad | 14 migraciones versionadas, 26 tablas, 4 vistas, 50 políticas RLS; restricción `appointments_no_overlap` que impide citas cruzadas incluso llamando la API directamente |
| Lógica de negocio | 25 funciones RPC para la app y 4 del sistema: reserva, caja, comisiones, asistencia, inventario y reportes |
| Correos | Cola `email_outbox`, Edge Function `process-email-outbox` con reintentos y recordatorio 24 h antes |
| Frontend | React 18 + Vite + Tailwind; 68 componentes y páginas para 4 roles; Docker con nginx; responsive desde 360 px |
| Datos personales | Autorización versionada, `delete-my-account` y `anonymize_customer()` |
| Documentación | 6 documentos técnicos (arquitectura, modelo de datos, seguridad, API, despliegue, pruebas) y README |
| Pruebas | 97 pruebas automatizadas de seguridad y flujos por rol; además, recorridos de extremo a extremo con Playwright y lint, formato y build sin errores |

### Indicadores de desempeño del producto

| Característica | Meta (Tabla 13, Fase 2) | Resultado | Clase |
| --- | --- | --- | --- |
| Adecuación funcional | 100 % de los RF "Debe" | 13 de 13 RF "Debe" y 3 de 3 "Debería" | Verificado |
| Fiabilidad | 0 defectos críticos abiertos | 0 | Verificado |
| Seguridad | 0 accesos indebidos entre roles | 0 en 97 pruebas con sesión de cada rol | Verificado |
| Mantenibilidad | ≥ 60 % de la lógica de negocio con pruebas | La lógica vive en Postgres y está cubierta por las 97 pruebas SQL; el frontend no tiene pruebas unitarias (ver sección 5) | Verificado, con desviación |
| Usabilidad | Reservar en menos de 1 minuto (4 de 5 usuarios) | 48 s en promedio, 5 de 5 usuarios | Ilustrativo |
| Eficiencia | Carga < 3 s en 4G | Se mide con Lighthouse en el piloto | Pendiente |
| Satisfacción | ≥ 4 sobre 5 en el piloto | 4,5 sobre 5 (sección 13) | Ilustrativo |

### Beneficios

Los cinco indicadores de beneficio de la Fase 2 empiezan a medirse con la salida a producción. Al cierre solo existe el resultado del piloto de una semana en La Castellana (12 al 16 de enero de 2027), que es ilustrativo.

| Indicador de beneficio | Línea base | Meta | Plazo | Piloto (ilustrativo) |
| --- | --- | --- | --- | --- |
| Turnos con entrada y salida marcadas | 0 % | ≥ 95 % | Mes 1 | 94 % |
| Inasistencias a citas reservadas | 18 % | ≤ 8 % | Mes 6 | Se mide desde febrero |
| Reservas hechas en línea | 0 % | ≥ 40 % | Mes 3 | Se mide desde febrero |
| Horas administrativas por semana | 12 h | ≤ 4 h | Mes 2 | 5 h (comisiones automáticas desde la primera quincena) |
| Productos agotados al mes | Sin registro | ≤ 2 referencias | Mes 3 | Se mide desde febrero |

El valor económico de estos beneficios, con precios de Montería, está en la sección 7.

## 5. Cumplimiento del alcance

Se entregaron los 16 requerimientos funcionales; de los 7 no funcionales, 4 están verificados, 2 solo se pueden medir en producción y 1 (RNF07) se cumplió con una desviación que el patrocinador debe aceptar.

### Requerimientos funcionales

| ID | Requerimiento | Prioridad | Estado | Implementación |
| --- | --- | --- | --- | --- |
| RF01 | Registrar, editar y desactivar barberos | Debe | Entregado | `barbers`, `barber_compensation`, `admin-create-staff` |
| RF02 | Horario semanal y novedades | Debe | Entregado | `barber_schedules`, `barber_time_off`, `branch_closures` |
| RF03 | Marcación con PIN en tablet | Debe | Entregado | `register_attendance()`, `get_kiosk_board()` |
| RF04 | Reporte de horas, retrasos y ausencias | Debe | Entregado | `attendance_report()` |
| RF05 | Catálogo de servicios | Debe | Entregado | `services`, `barber_services`, bucket `catalog` |
| RF06 | Productos y stock por sede | Debe | Entregado | `products`, `product_stock`, `inventory_movements` |
| RF07 | Alerta de stock mínimo | Debería | Entregado | Vista `v_low_stock` |
| RF08 | Reserva en línea sin dobles reservas | Debe | Entregado | `book_appointment()`, `appointments_no_overlap` |
| RF09 | Confirmación, recordatorio y cancelación hasta 2 h antes | Debe | Entregado | `email_outbox`, `process-email-outbox`, `cancel_appointment()` |
| RF10 | Clientes sin cita y reservas por teléfono | Debe | Entregado | `staff_upsert_customer()`, `staff_create_appointment()` |
| RF11 | Autorización de datos y eliminación de cuenta | Debe | Entregado | `delete-my-account`, `anonymize_customer()` |
| RF12 | Registrar servicios y ventas | Debe | Entregado | `create_sale()`, `void_sale()` |
| RF13 | Comisiones quincenales (55 % y 10 %) | Debe | Entregado | `commission_summary()`, `close_commission_period()` |
| RF14 | Panel de indicadores | Debería | Entregado | `dashboard_summary()` |
| RF15 | Exportar ventas a CSV | Debería | Entregado | Vista `v_sales_export` |
| RF16 | Inicio de sesión por rol | Debe | Entregado | Supabase Auth, `profiles.role`, RLS |

### Requerimientos no funcionales

| ID | Atributo | Estado | Evidencia o salvedad |
| --- | --- | --- | --- |
| RNF01 | Usabilidad | Verificado | Reserva en pasos cortos y diseño responsive desde 360 px (recorridos con Playwright en móvil) |
| RNF02 | Rendimiento | Se mide en producción | Lighthouse sobre 4G en el piloto |
| RNF03 | Seguridad | Verificado | RLS en las 26 tablas, funciones con `search_path` vacío, PIN en bcrypt |
| RNF04 | Disponibilidad | Se mide en producción | Monitoreo mensual de la disponibilidad en horario de atención |
| RNF05 | Respaldo | Verificado | Plan Pro de Supabase desde enero de 2027 |
| RNF06 | Privacidad | Verificado | Consentimiento versionado, supresión con anonimización, `audit_log` |
| RNF07 | Mantenibilidad | Desviación | Código versionado en GitHub con ESLint y Prettier, pero el frontend está en JavaScript (no TypeScript) y los cambios se integraron sin pull request |

### Desviaciones y cambios de alcance

| # | Cambio | Origen | Efecto en costo y fecha | Decisión |
| --- | --- | --- | --- | --- |
| 1 | Identidad visual negro y dorado en el menú, encabezados y pie; el contenido sigue en tonos claros | Solicitud del cliente (27 oct) | Ninguno; se resolvió con dos commits el 27 oct | Aprobado |
| 2 | Fotos reales con licencia Unsplash en productos y barberos | Solicitud del cliente | Ninguno | Aprobado |
| 3 | Despliegue con Docker y nginx además de Netlify | Equipo | Ninguno; da independencia de proveedor | Aprobado |
| 4 | JavaScript en lugar de TypeScript (RNF07) | Equipo | Ninguno | Pendiente de aceptación |
| 5 | Pruebas unitarias del frontend sustituidas por 97 pruebas SQL y recorridos Playwright | Equipo | Ninguno | Pendiente de aceptación |
| 6 | Prototipo Figma sustituido por el frontend navegable | Equipo | Ninguno; no hay archivo Figma en el repositorio | Pendiente de aceptación |

No se agregó ninguna de las exclusiones firmadas. Las solicitudes de cambio aprobadas son 3, una por encima del umbral verde (≤ 2) de la Tabla 20 de la Fase 2, pero sin impacto en costo ni fecha.

## 6. Cumplimiento del cronograma

El producto quedó listo para piloto el 4 de noviembre de 2026, 44 días antes del hito H2 (18 de diciembre), y la salida a producción se mantuvo en la fecha planeada, el 25 de enero de 2027.

| ID | Actividad | Plan | Real | Diferencia | Clase |
| --- | --- | --- | --- | --- | --- |
| A1 | Acta y plan del proyecto | 13 a 16 oct | 13 a 16 oct | 0 días | Verificado |
| A2 | Requerimientos e historias de usuario | 19 a 23 oct | 19 a 23 oct | 0 días | Verificado |
| A3 | Prototipo UX/UI | 26 a 30 oct | Sustituido por el frontend navegable, 27 oct | 3 días antes | Verificado |
| A4 | Modelo de datos y políticas RLS | 26 oct a 6 nov | Migraciones del 26 y 27 oct | 10 días antes | Verificado |
| A5 | Entorno: repositorio y Supabase | 3 a 5 nov | 26 oct | 10 días antes | Verificado |
| H1 | Diseño aprobado | 6 nov | 27 oct | 10 días antes | Ilustrativo |
| A6 | Sprint 1: barberos, horarios y asistencia | 9 a 20 nov | Entrega integrada del 27 oct | 24 días antes | Verificado |
| A7 | Sprint 2: catálogo e inventario | 23 nov a 4 dic | Entrega integrada del 27 oct | 38 días antes | Verificado |
| A9 | Sprint 3: reservas, clientes y caja | 7 a 18 dic | Entrega integrada del 27 oct | 52 días antes | Verificado |
| A10 | Pruebas funcionales y de seguridad | 14 a 18 dic | Hasta el 9 nov (commit `ddc0b5d`) | 39 días antes | Verificado |
| H2 | Producto listo para piloto | 18 dic | 4 nov | 44 días antes | Verificado |
| A8 | Compra e instalación de tablets | 23 nov a 4 dic | 25 nov a 3 dic | 1 día antes | Ilustrativo |
| A11 | Despliegue en producción y manuales | 5 a 8 ene | 5 a 8 ene | 0 días | Ilustrativo |
| A12 | Piloto en La Castellana | 12 a 16 ene | 12 a 16 ene | 0 días | Ilustrativo |
| A13 | Capacitación y arranque en Centro | 19 a 23 ene | 19 a 23 ene | 0 días | Ilustrativo |
| H3 | Salida a producción | 25 ene | 25 ene | 0 días | Ilustrativo |
| A14 | Cierre y lecciones aprendidas | 26 a 29 ene | 26 a 29 ene | 0 días | Ilustrativo |
| A15 | Soporte posterior | 26 ene a 23 abr | En curso | Continúa tras el cierre | Contrato |

Las sesiones de desarrollo no se registraron por separado: el repositorio muestra una entrega integrada el 27 de octubre (`43ad9b0` y `b74f324`) y los últimos ajustes el 4 de noviembre (`a4716d0`), por eso los tres sprints comparten fecha real.

**Resumen.** De 15 actividades y 3 hitos planificados, 14 actividades y los 3 hitos están terminados a tiempo o antes (100 % de hitos a tiempo). La actividad A15 sigue por contrato hasta el 23 de abril de 2027. Con los paquetes 1.2 a 1.6 terminados (COP 11.000.000 de valor ganado mínimo) frente a un valor planeado de COP 7,63 millones al 30 de noviembre, el SPI en esa fecha fue de al menos 1,44; al cierre es de 1,00.

**Por qué no se adelantó la salida a producción.** Tres condiciones la fijan en enero: la restricción de no cambiar la operación del 21 de diciembre al 8 de enero por temporada alta, la llegada de las tablets y la disponibilidad del patrocinador para el piloto. El tiempo ganado se usó como colchón de calidad: pruebas por rol, ajustes de interfaz móvil y documentación técnica.

## 7. Cierre financiero

El proyecto costó COP 18.550.486 frente a COP 20.482.000 aprobados, una diferencia favorable de COP 1.931.514 (9,4 %) formada por la contingencia no usada (COP 1.862.000) y un ahorro de COP 69.514 en compras.

### Presupuesto aprobado frente a costo final

| Paquete de la EDT | Presupuesto (COP) | Costo final (COP) | Variación (COP) |
| --- | --- | --- | --- |
| 1.1 Gestión del proyecto | 2.880.000 | 2.880.000 | 0 |
| 1.2 Análisis y diseño | 2.600.000 | 2.600.000 | 0 |
| 1.3 Sprint 1: personal | 2.400.000 | 2.400.000 | 0 |
| 1.4 Sprint 2: catálogo | 1.900.000 | 1.900.000 | 0 |
| 1.5 Sprint 3: reservas y caja | 2.500.000 | 2.500.000 | 0 |
| 1.6 Pruebas y calidad | 1.600.000 | 1.600.000 | 0 |
| 1.7 Implementación | 3.990.000 | 3.920.486 | 69.514 |
| 1.8 Soporte posterior (comprometido hasta el 23 abr 2027) | 750.000 | 750.000 | 0 |
| **Línea base de costos** | **18.620.000** | **18.550.486** | **69.514** |
| Reserva de contingencia (10 %) | 1.862.000 | 0 | 1.862.000 |
| **Total** | **20.482.000** | **18.550.486** | **1.931.514** |

Los seis primeros paquetes son talento humano contratado a precio fijo (Tabla 17 de la Fase 2), así que no varían. Toda la variación está en las compras del paquete 1.7. Los índices de valor ganado al cierre son CPI = 18.620.000 / 18.550.486 = 1,00 y SPI = 1,00 sobre los paquetes 1.1 a 1.7; el soporte (1.8) termina el 23 de abril de 2027.

### Detalle de las compras

| Adquisición | Presupuesto (COP) | Costo final (COP) | Cómo se calculó | Clase |
| --- | --- | --- | --- | --- |
| Desarrollo (contrato a precio fijo) | 15.230.000 | 15.230.000 | Pago por hitos; el código se cede a la barbería | Verificado |
| 2 tablets de 10" | 1.600.000 | 1.600.000 | 2 × COP 800.000 por una [Samsung Galaxy Tab A9+](https://www.samsung.com/co/tablets/galaxy-tab-a/galaxy-tab-a9-plus-wifi-mystic-silver-128gb-sm-x210nzsecoo/) de 11", 8 GB de RAM y 128 GB; las tiendas colombianas cargan el precio de forma dinámica y no se pudo confirmar, así que se mantiene el del presupuesto hasta tener la factura | Por confirmar |
| Supabase Pro, 12 meses | 1.200.000 | 1.152.489 | USD 25 × 12 meses × TRM de COP 3.228,26 = COP 968.478, más 19 % de IVA supuesto por ser un servicio digital del exterior ([precio](https://toolradar.com/blog/supabase-pricing-2026), [TRM](https://www.dolar-colombia.com/2026-11-06)) | Referencia de mercado |
| Dominio .com.co, 1 año | 90.000 | 67.997 | USD 17,70 × COP 3.228,26 = COP 57.140, más 19 % de IVA ([precio en Dynadot](https://www.dynadot.com/es/dominio/com.co)) | Referencia de mercado |
| Capacitación (material y refrigerios) | 500.000 | 500.000 | Compra directa en enero | Ilustrativo |
| Talento humano de implementación (1.7) | 600.000 | 600.000 | Incluido en el contrato de desarrollo | Verificado |

El plan calculó Supabase con un dólar a COP 4.000. Si la TRM volviera a ese nivel, el costo subiría a COP 1.428.000 (COP 228.000 más) y quedaría cubierto por la contingencia.

### Pagos y devolución al propietario

| Concepto | COP |
| --- | --- |
| Pago 1 (50 % del presupuesto), octubre de 2026 | 10.241.000 |
| Pago 2 ajustado: costo final menos pago 1, contra la salida a producción (H3) | 8.309.486 |
| Total desembolsado | 18.550.486 |
| Reserva no usada que vuelve al propietario | 1.931.514 |

### Ingresos y gastos de la barbería antes del sistema

Para medir el beneficio hace falta saber cuánto gana hoy la barbería. La tabla arma un estado de resultados mensual de referencia con los datos de la Fase 1 y los rangos de mercado de Colombia.

| Concepto | COP al mes | Base |
| --- | --- | --- |
| Ingresos por servicios | 44.000.000 | 2.000 servicios × ticket de COP 22.000 (Fase 1). En Montería un corte de adulto cuesta desde 18.000 y corte con barba 25.000 ([Fresha](https://www.fresha.com/a/johns-barberclub-monteria-carrera-28-9-2-llrg5gf7)) |
| Comisión de los barberos (55 %) | −24.200.000 | Modelo de la barbería; el rango del sector es 40 a 60 % |
| **Margen sobre servicios** | **19.800.000** |  |
| Arriendo de las dos sedes | −6.500.000 | Supuesto de COP 3,5 y 3,0 millones; el rango nacional es 2,5 a 5 millones por local de 25 a 35 m² ([Modelos de plan de negocios](https://modelosdeplandenegocios.com/blogs/news/cuanto-cuesta-montar-barberia-colombia)) |
| Servicios públicos | −1.200.000 | 2 × COP 600.000, extremo alto del rango de 350.000 a 600.000 por local |
| Insumos de operación | −1.600.000 | 2 × COP 800.000, extremo alto del rango de 500.000 a 800.000 por local |
| Administradora y 2 recepcionistas | −8.146.467 | 3 × COP 2.715.489 de costo total por persona con el SMMLV 2026 ([consultorsalud](https://consultorsalud.com/aumento-del-salario-minimo-en-colombia-2026/)) |
| **Resultado operativo de referencia** | **2.353.533** | 5,3 % de los ingresos |

El costo por persona suma salario (COP 1.750.905), auxilio de transporte (COP 249.095), prima, cesantías, intereses, vacaciones, pensión, ARL y caja de compensación, y supone la exoneración de salud, SENA e ICBF del artículo 114-1 del Estatuto Tributario; sin ella cada persona cuesta unos COP 236.000 más. El resultado no incluye internet, contador, publicidad, impuestos, venta de productos (no medida antes del sistema) ni el retiro del propietario: es un orden de magnitud, no contabilidad.

Dos controles de coherencia. El margen de 5,3 % cae en el rango de 5 a 10 % que se reporta para barberías básicas. Y cada barbero recibe unos COP 2,69 millones al mes (COP 24,2 millones entre 9), por encima de los COP 0,9 a 2,2 millones que [Pulzo](https://www.pulzo.com/economia/cuanto-gana-barbero-peluquero-estilista-colombia-2024-PP4048755) cita para el sector, algo esperable en un modelo solo a comisión con unos 8,5 servicios por barbero al día.

### Beneficio, retorno y sensibilidad

| Beneficio | Cálculo | COP al mes |
| --- | --- | --- |
| Menos inasistencias | 900 reservas × 10 puntos menos (18 % a 8 %) = 90 citas × 22.000 × 45 % que queda a la barbería | 891.000 |
| Reservas fuera de horario | 40 citas × 22.000 × 45 % | 396.000 |
| Menos tiempo administrativo | 8 h por semana × 4,3 semanas × COP 10.000 por hora | 344.000 |
| Menos merma de productos | Pérdidas de 400.000 a 200.000 | 200.000 |
| **Total** |  | **1.831.000** |

Los supuestos de la Fase 1 se mantienen porque el ticket de COP 22.000 coincide con los precios de Montería. Con los COP 1.831.000 mensuales, el beneficio del año 1 es de COP 21.972.000 y el ROI es (21.972.000 − 18.550.486) / 18.550.486 = 18,4 %, frente al 7 % planeado. Con el sistema, el resultado operativo de referencia pasa de COP 2,35 millones a unos COP 4,08 millones al mes, ya descontados COP 101.667 mensuales de Supabase y dominio. El beneficio equivale al 78 % del resultado actual, así que no es un detalle.

Como los beneficios dependen de que el personal y los clientes adopten el sistema, la tabla muestra qué pasa si solo se logra una parte.

| Beneficio logrado | COP al mes | Recuperación (meses) | Ganancia neta a 24 meses (COP) |
| --- | --- | --- | --- |
| 100 % | 1.831.000 | 10,1 | 24.173.514 |
| 70 % | 1.281.700 | 14,7 | 10.990.314 |
| 50 % | 915.500 | 21,3 | 2.201.514 |

Incluso con la mitad del beneficio el proyecto se paga antes de los 24 meses. Una plataforma comercial también tiene costos recurrentes: [AgendaPro](https://agendapro.com/co/planes-int) cobra aparte los recordatorios por WhatsApp (desde COP 10.000 al mes por 50 mensajes) y la facturación electrónica (desde COP 90.000 al mes), y sus planes se escalan por profesional.

### Curva de recuperación de la inversión

&#91;embedded content: cálculo propio con los supuestos de la sección 7 · costo COP 18.550.486, beneficio COP 1.831.000 al mes, 24 meses desde la salida a producción\]

La línea azul es el caso del plan. Las grises muestran qué pasa si solo se logra el 70 % o el 50 % del beneficio; en ambos casos la inversión se recupera antes del mes 24.

## 8. Validación de entregables

Los 6 entregables con criterio de aceptación en la Fase 2 están cumplidos y aprobados; la validación de los que dependen de la operación en enero queda registrada con valores ilustrativos hasta tener los reales.

### Criterios de aceptación

| Entregable | Criterio (Tabla 4, Fase 2) | Resultado | Aprueba | Clase |
| --- | --- | --- | --- | --- |
| Documento de requerimientos | Historias de usuario con criterios de aceptación para los 16 RF, validadas | 16 de 16 RF documentados (Tabla 2) | Laura Méndez | Verificado |
| Prototipo UX/UI | Pantallas de los 4 roles navegables; 3 de 3 usuarios completan una reserva sin ayuda | Frontend navegable para los 4 roles; sin archivo Figma | Laura Méndez | Verificado, con desviación |
| Modelo de datos | Tablas, relaciones y RLS documentadas; pruebas de acceso por rol aprobadas | 26 tablas, 50 políticas, 97 pruebas aprobadas | Juan Ramos Torralvo | Verificado |
| Incremento de cada sprint | Cumple la Definición de Terminado y se muestra en demostración | Cumplida, salvo pruebas unitarias del frontend y revisión por pull request (sección 5) | Laura Méndez | Verificado, con desviación |
| Piloto | Una semana en La Castellana con cero dobles reservas y al menos 90 % de marcaciones | 0 dobles reservas; 94 % de marcaciones | Andrés Rincón | Ilustrativo |
| Sistema en producción | Ambas sedes operando, manuales entregados y personal capacitado | Ambas sedes desde el 25 ene 2027 | Andrés Rincón | Ilustrativo |

### Qué se entregó y qué se validó

| Producto | Evidencia de que funciona |
| --- | --- |
| Sistema implementado | Reservas, caja, comisiones, asistencia, inventario y panel probados con una sesión de cada rol |
| Aplicación desarrollada | Frontend que compila sin errores de lint ni formato; recorridos de extremo a extremo para cliente, recepción, barbero y administrador |
| Base de datos configurada | 14 migraciones aplicadas en el proyecto de la nube, catálogo cargado y 3 tareas programadas activas |
| Infraestructura instalada | Supabase (datos, autenticación, archivos y funciones), contenedor Docker con nginx y 2 tablets en las sedes |
| Plataforma puesta en producción | Ambas sedes operando el 25 ene 2027 |

### Matriz de cumplimiento de entregables

| Entregable | Estado | Responsable | Fecha | Clase |
| --- | --- | --- | --- | --- |
| Acta de constitución y plan del proyecto | Aprobado | Juan Ramos Torralvo | 16/10/2026 | Verificado |
| Documento de requerimientos | Aprobado | Juan Ramos Torralvo | 23/10/2026 | Verificado |
| Interfaz navegable de los 4 roles | Aprobado con desviación | Juan Burgos | 27/10/2026 | Verificado |
| Modelo de datos y políticas RLS | Aprobado | Irwin Cardona | 27/10/2026 | Verificado |
| Sprint 1: barberos, horarios y asistencia | Aprobado | Irwin Cardona y Juan Burgos | 27/10/2026 | Verificado |
| Sprint 2: catálogo e inventario | Aprobado | Irwin Cardona y Juan Burgos | 27/10/2026 | Verificado |
| Sprint 3: reservas, clientes y caja | Aprobado | Irwin Cardona y Juan Burgos | 27/10/2026 | Verificado |
| Pruebas funcionales y de seguridad | Aprobado | Todo el equipo | 04/11/2026 | Verificado |
| Documentación técnica (6 documentos) | Aprobado | Irwin Cardona | 04/11/2026 | Verificado |
| 2 tablets instaladas en las sedes | Aprobado | Juan Ramos Torralvo | 03/12/2026 | Ilustrativo |
| Despliegue en producción y manuales | Aprobado | Irwin Cardona y Juan Burgos | 08/01/2027 | Ilustrativo |
| Piloto en La Castellana | Aprobado | Todo el equipo | 16/01/2027 | Ilustrativo |
| Capacitación del personal | Aprobado | Juan Ramos Torralvo y Juan Burgos | 23/01/2027 | Ilustrativo |
| Sistema en producción en ambas sedes | Aprobado | Equipo de desarrollo | 25/01/2027 | Ilustrativo |
| Informe de cierre y lecciones aprendidas | Aprobado | Juan Ramos Torralvo | 29/01/2027 | Ilustrativo |

## 9. Registro de riesgos finales

De los 13 riesgos registrados, 3 se materializaron (todos antes de llegar a producción y sin costo ni retraso) y 10 no ocurrieron; el uso de la reserva de contingencia fue de 0 % frente al límite de 30 % del tablero.

| ID | Riesgo | Exposición inicial | Materializado | Acciones realizadas | Estado final |
| --- | --- | --- | --- | --- | --- |
| R01 | Los barberos no adoptan la marcación ni la agenda | 16 (alta) | No | Piloto con 2 barberos líderes; cada barbero ve sus comisiones en la app | Transferido a operación: se mide en el mes 1 |
| R02 | Se piden funciones fuera del alcance | 12 (media) | Parcial | 3 cambios visuales y de imágenes pasaron por solicitud de cambio; ninguna exclusión se agregó | Cerrado |
| R03 | Errores de disponibilidad generan dobles reservas | 12 (media) | No | Restricción `appointments_no_overlap` en la base de datos y pruebas de cruce | Cerrado |
| R04 | Retrasos por carga académica del equipo | 12 (media) | No | Prioridad MoSCoW; SPI de al menos 1,44 al 30 de noviembre | Cerrado |
| R05 | Fallas en RLS exponen datos personales | 10 (media) | Sí, en desarrollo | Las pruebas por rol detectaron una validación que, por la lógica de nulos de SQL, dejaba pasar a usuarios sin rol; se corrigió antes de la entrega | Cerrado |
| R06 | Los clientes siguen reservando solo por WhatsApp | 9 (media) | No | Enlace de reserva para WhatsApp Business, Instagram y Google Maps | Transferido a operación: se mide en el mes 1 |
| R07 | Un integrante deja de estar disponible | 8 (media) | No | 6 documentos técnicos y código en GitHub | Cerrado |
| R08 | Sobrecosto frente a la línea base | 8 (media) | No | Costo final 0,4 % por debajo de la línea base | Cerrado |
| R09 | Retraso o sobreprecio en las tablets | 6 (baja) | No | Tres cotizaciones y compra seis semanas antes del piloto | Cerrado |
| R10 | Los recordatorios llegan a spam | 6 (baja) | No | Dominio propio verificado en el servicio de correo durante el despliegue | Transferido a operación |
| R11 | Cambios de precio o límites de Supabase | 6 (baja) | No | El dólar bajó de COP 4.000 a 3.228, lo que redujo el costo; PostgreSQL permite migrar | Aceptado y monitoreado cada mes |
| R12 | Caída de internet en una sede | 6 (baja) | No | Datos móviles como respaldo | Transferido a operación |
| R13 | Requisito visual mal interpretado (nuevo) | No estaba | Sí | El "negro" se aplicó a toda la interfaz cuando el cliente pidió solo el menú, los encabezados y el pie; se corrigió con dos commits | Cerrado |

Los dos riesgos altos de la Fase 1 (resistencia de los barberos y crecimiento del alcance) quedaron con respuesta activa: el primero pasa a medirse en operación y el segundo se cerró sin ampliar el alcance. La exposición es probabilidad por impacto: de 15 a 25 es alta, de 8 a 14 media y de 1 a 7 baja.

## 10. Registro de incidentes y problemas resueltos

Se registraron 16 incidentes durante el desarrollo y la revisión final; los 16 están cerrados, ninguno afectó a clientes reales y los dos más serios de la primera etapa los encontraron las pruebas automáticas.

| # | Incidente | Impacto | Solución implementada | Estado |
| --- | --- | --- | --- | --- |
| 1 | Una regla de stock bloqueaba la venta de productos (detectado por las pruebas) | No se podían cobrar productos | Se corrigió la regla y quedó una prueba de regresión | Cerrado |
| 2 | La validación de permisos dejaba pasar a usuarios sin rol por la lógica de nulos de SQL (detectado por las pruebas) | Acceso indebido posible a funciones del personal | Se corrigió la validación y se agregó la prueba | Cerrado |
| 3 | `docker compose up` fallaba porque las variables `VITE_*` no tenían valor | El frontend no se podía levantar con un comando | Valores por defecto en `docker-compose.yml` y explicación en el README | Cerrado |
| 4 | Cabeceras CORS duplicadas en las respuestas | El navegador rechazaba algunas peticiones | Una sola fuente de cabeceras (`_shared`) | Cerrado |
| 5 | La política de seguridad de nginx bloqueaba imágenes externas | Las fotos de productos y barberos no cargaban | La CSP permite `images.unsplash.com` | Cerrado |
| 6 | El campo de contraseña no aceptaba la referencia de react-hook-form | Error en consola y validación del formulario sin enfocar el campo | El componente se reescribió con `forwardRef` | Cerrado |
| 7 | El rol barbero recibía errores 403 en `/panel` | Peticiones fallidas y pantalla con errores | Las consultas del panel se activan solo para quien tiene permiso y el barbero va directo a su agenda | Cerrado |
| 8 | El nombre del producto se solapaba con el botón de cerrar del modal y las tarjetas se desalineaban en móvil | Defecto visual | Margen derecho en el título y alineación superior de las tarjetas | Cerrado |
| 9 | Interfaz toda negra cuando se pidió solo menú, encabezados y pie | Retrabajo menor | Se subió primero la versión anterior y luego los cambios en un segundo commit (`b74f324`) | Cerrado |
| 10 | El menú móvil se veía sin fondo en páginas con scroll | Menú ilegible en el celular | El encabezado con `backdrop-filter` limitaba la capa fija a 64 px; el menú se dibuja ahora fuera del encabezado, con fondo negro (`a4716d0`) | Cerrado |
| 11 | Anular una venta impedía volver a cobrar la misma cita (restricción de unicidad por cita) | Una cita con venta anulada no podía cobrarse de nuevo | Índice único solo sobre ventas vigentes; la anulación devuelve la cita a su estado | Cerrado |
| 12 | Un cliente podía reservar dos citas que se cruzaban o superar el máximo de citas activas con dos solicitudes simultáneas | Reservas duplicadas | Restricción de exclusión por cliente, bloqueo por cliente al reservar y mensajes claros en la reserva y la reprogramación | Cerrado |
| 13 | Sin la clave de Resend, la función de correos marcaba los mensajes como enviados | Los correos parecían entregados sin haber salido | Sin clave el envío falla y se reintenta; el modo simulado exige `EMAIL_DRY_RUN=true` | Cerrado |
| 14 | La API pública exponía las cantidades exactas de inventario | Fuga de información comercial | Cantidades solo para el personal; el público consulta la vista `product_availability` (hay o no hay producto) | Cerrado |
| 15 | Recepción podía cambiar estado, hora o precio de una cita por la API directa y agendar en el pasado, en cierres o fuera de horario | Citas inválidas y saltos de las reglas del negocio | Permiso de edición solo sobre notas internas; validación de agenda (`staff_slot_problem`) en el alta y la reprogramación del personal | Cerrado |
| 16 | La supresión de datos dejaba correos enviados, notas de citas y datos en la auditoría | Datos personales que sobrevivían a la anonimización (Ley 1581 de 2012) | La función borra correos y notas y depura el perfil y la auditoría, y se agregó una prueba | Cerrado |

**Revisión final del 9 de noviembre de 2026.** Antes de la entrega se auditó todo el sistema (base de datos, funciones, políticas, frontend y despliegue) y se corrigieron los hallazgos en la migración `20261109210000_correcciones_finales.sql`: además de los incidentes 11 a 16, las reglas del negocio ahora tienen límites (por ejemplo, el PIN no admite 0 intentos), la asistencia solo se marca desde un dispositivo de la sede, el reporte de asistencia no cuenta ausente a quien aún no inicia su turno, las quincenas se cierran completas y en orden, los avatares ya no se pueden listar públicamente y el historial de mostrador solo se enlaza con un correo confirmado. En el frontend se agregó el aviso de cuenta desactivada, la redirección de inicio de sesión es más segura y las fechas usan la zona horaria del negocio; el despliegue quitó localhost de la política de seguridad, agregó HSTS y dejó el modo demostración apagado por defecto. La migración y la función de correos se aplicaron en el proyecto de la nube y las pruebas pasaron de 82 a 97. El envío de correos reales funciona con Resend: mientras no se verifique un dominio propio, solo llegan al correo dueño de la cuenta de Resend.

## 11. Lecciones aprendidas

La lección más valiosa fue poner las reglas del negocio en la base de datos y probarlas con sesiones de cada rol: así se encontraron los dos defectos más graves antes de que llegaran a un usuario. Todo lo que sigue sale del desarrollo real del proyecto.

### Buenas prácticas

- Las reglas que no se pueden romper (citas cruzadas, stock negativo, cambio de rol propio) viven en Postgres con `EXCLUDE`, `CHECK` y triggers, no en el frontend.
- Las 97 pruebas SQL usan el rol de Postgres y el JWT de cada tipo de usuario, así se prueba lo que vería cada persona.
- El patrón outbox para los correos evita perder una reserva si el servicio de correo falla.
- Los datos de demostración (14 días de historial y 15 cuentas) permitieron validar cada rol sin esperar al cliente.
- Valores por defecto en `docker-compose.yml` para que el sistema arranque con un solo comando.

### Errores cometidos

- Se aplicó el negro a toda la interfaz sin confirmar qué partes pedía el cliente; costo: un retrabajo menor.
- Los recorridos de extremo a extremo con Playwright se ejecutaron pero no se guardaron en el repositorio, y el frontend no tiene pruebas unitarias.
- Se trabajó directo sobre la rama principal, sin pull requests, y el frontend se escribió en JavaScript aunque RNF07 pedía TypeScript.
- El plan fijó el dólar en COP 4.000 sin un rango de sensibilidad; la tasa real fue 19 % menor.
- No se conservó un archivo de prototipo en Figma, así que la administradora validó sobre la aplicación ya construida y no sobre bocetos.

### Soluciones efectivas

- Dibujar el menú móvil con `createPortal` fuera del encabezado resolvió el fondo roto, cuya causa era el `backdrop-filter` del encabezado.
- Condicionar las consultas del panel al rol eliminó los errores 403 del barbero.
- Subir primero la versión anterior y luego los cambios en un segundo commit dejó trazable el cambio de identidad visual.
- Medir los beneficios con los precios de Montería (corte de adulto desde COP 18.000, corte con barba COP 25.000) confirmó que el ticket de COP 22.000 era razonable.

### Recomendaciones para futuros proyectos

1. Confirmar con una captura o un boceto cada cambio visual antes de aplicarlo a toda la interfaz.
2. Versionar en el repositorio las pruebas de extremo a extremo y correrlas en cada pull request.
3. Exigir pull request y revisión cruzada desde el primer commit, aunque el equipo sea de tres personas.
4. Presupuestar las compras en dólares con un rango de TRM (por ejemplo, 3.200 a 4.200) y no con un solo valor.
5. Guardar el prototipo como artefacto de validación y aprobación del cliente, aunque se construya rápido.
6. Medir el rendimiento con Lighthouse en una conexión 4G real antes de declarar cumplido un requisito de tiempo de carga.

## 12. Plan de transferencia y soporte

La barbería recibe el sistema con cuentas, código y documentación a su nombre, personal capacitado y 3 meses de soporte a cargo de Irwin Cardona (hasta el 23 de abril de 2027).

### Entrega al área operativa

| Elemento | Se entrega a | Cómo | Fecha | Clase |
| --- | --- | --- | --- | --- |
| Cuentas de Supabase, correo transaccional, dominio y GitHub | Andrés Rincón (titular) y Laura Méndez (administradora) | Se registran a nombre de la barbería, con autenticación en dos pasos y dos administradores | 22/01/2027 | Ilustrativo |
| Código fuente | La barbería | Cesión por contrato y transferencia del repositorio a su organización de GitHub | 22/01/2027 | Ilustrativo |
| Cuentas reales del personal | Laura Méndez | Se crean con la función `admin-create-staff`; las 15 cuentas de demostración se desactivan antes de operar | 08/01/2027 | Ilustrativo |
| Datos iniciales | Laura Méndez | Carga de sedes, servicios, productos y los 9 barberos con su PIN | 08/01/2027 | Ilustrativo |
| Copias de seguridad | Irwin Cardona | Copias diarias del plan Pro y una prueba de restauración | 15/01/2027 | Ilustrativo |
| Manuales y documentación técnica | Laura Méndez | Carpeta compartida con la guía rápida por rol y los 6 documentos técnicos | 08/01/2027 | Ilustrativo |

### Capacitación realizada

| Sesión | Sede | Participantes | Contenido | Fecha | Duración |
| --- | --- | --- | --- | --- | --- |
| 1 | La Castellana | 5 barberos y 1 recepcionista | Agenda, marcación con PIN y comisiones | 19/01/2027 | 2 h |
| 2 | La Castellana | 5 barberos y 1 recepcionista | Práctica guiada: cobro, reservas por teléfono e inventario | 21/01/2027 | 2 h |
| 3 | Centro | 4 barberos y 1 recepcionista | Agenda, marcación con PIN y comisiones | 20/01/2027 | 2 h |
| 4 | Centro | 4 barberos y 1 recepcionista | Práctica guiada: cobro, reservas por teléfono e inventario | 22/01/2027 | 2 h |
| 5 | Ambas | Laura Méndez y Andrés Rincón | Administración: personal, catálogo, cierre de quincena y panel | 23/01/2027 | 3 h |

Las cinco sesiones suman 11 horas y 24 asistencias previstas (6 + 6 + 5 + 5 + 2) para 13 personas: 9 barberos, 2 recepcionistas, la administradora y el propietario. El costo es de COP 500.000 en material y refrigerios. La lista de asistencia y el modelo de constancia están en el Anexo B.

### Manuales suministrados

| Manual | Para quién | Dónde |
| --- | --- | --- |
| Guía rápida de una página por rol (cliente, recepción, barbero, administrador) | Personal y clientes | Anexo A de este informe |
| README del proyecto y del frontend | Quien instale o ejecute el sistema | Repositorio |
| Arquitectura, modelo de datos, seguridad, API, despliegue y pruebas | Quien mantenga el sistema | Carpeta `docs/` del repositorio |

### Responsables del soporte posterior

| Nivel | Responsable | Qué atiende | Tiempo de respuesta | Canal |
| --- | --- | --- | --- | --- |
| 1 | Laura Méndez | Contraseñas, PIN, altas de personal, precios y catálogo | El mismo día | Directo en la sede |
| 2 | Irwin Cardona | Errores del sistema, base de datos, correos y copias de seguridad | Críticos 24 h, altos 3 días, medios y bajos en el sprint siguiente | Grupo de WhatsApp y GitHub Issues |
| 3 | Juan Burgos | Errores de interfaz y mejoras de uso | 3 días | GitHub Issues |
| Escalamiento | Juan Ramos Torralvo | Cambios de alcance, costo o fecha, con aprobación del patrocinador | 2 días hábiles | Reunión quincenal |

El soporte incluye 30 horas (10 al mes durante 3 meses a COP 25.000), es decir COP 750.000, ya pagados dentro del contrato. Después del 23 de abril de 2027 la barbería decide si lo renueva; el costo recurrente de la nube y el dominio es de unos COP 1,22 millones al año.

### Evidencias de capacitación

Para el cierre se anexan: la lista de asistencia de cada sesión, la presentación usada, la constancia de capacitación firmada por cada asistente y capturas de pantalla de la práctica guiada. La lista de asistencia y el modelo de constancia están en el Anexo B.

## 13. Encuesta de satisfacción

La encuesta mide cuatro dimensiones con ocho afirmaciones en escala de 1 a 5 y la meta es un promedio de al menos 4,0; el valor de referencia del caso de estudio es 4,5. Los resultados de esta sección son ilustrativos y deben reemplazarse por los de la aplicación real.

### Instrumento

Se aplica por formulario en el celular al terminar el piloto y la capacitación, a 23 personas: 9 barberos, 2 recepcionistas, la administradora, el propietario y 10 clientes frecuentes. Es anónima y toma menos de 3 minutos. Escala: 1 = muy en desacuerdo, 5 = muy de acuerdo.

| # | Dimensión | Afirmación |
| --- | --- | --- |
| 1 | Calidad del producto | El sistema hace lo que necesito sin errores |
| 2 | Calidad del producto | La información que veo (agenda, comisiones, stock) es correcta |
| 3 | Cumplimiento de expectativas | El sistema resuelve el problema por el que se pidió |
| 4 | Cumplimiento de expectativas | Puedo usarlo sin que alguien me ayude |
| 5 | Oportunidad en la entrega | El sistema se entregó en las fechas acordadas |
| 6 | Oportunidad en la entrega | La capacitación llegó a tiempo, antes de usarlo |
| 7 | Satisfacción general | Estoy satisfecho con el sistema |
| 8 | Satisfacción general | Lo recomendaría a otra barbería |

Dos preguntas abiertas completan el instrumento: ¿qué es lo que mejor funciona? y ¿qué cambiaría primero?

### Resultados (ilustrativos)

| Dimensión | Promedio (1 a 5) | Meta | Cumple |
| --- | --- | --- | --- |
| Calidad del producto | 4,5 | 4,0 | Sí |
| Cumplimiento de expectativas | 4,4 | 4,0 | Sí |
| Oportunidad en la entrega | 4,7 | 4,0 | Sí |
| Satisfacción general | 4,45 | 4,0 | Sí |
| **Promedio global** | **4,5** | 4,0 | Sí |

| Grupo | Personas | Promedio |
| --- | --- | --- |
| Barberos | 9 | 4,3 |
| Recepcionistas | 2 | 4,7 |
| Administradora y propietario | 2 | 4,8 |
| Clientes frecuentes | 10 | 4,6 |

El grupo con menor puntaje es el de los barberos, el mismo que la Fase 2 identificó como el de mayor brecha de compromiso (R01). Por eso la primera revisión posterior al cierre, en febrero de 2027, se dedica a sus comentarios y a la lectura de sus comisiones en la aplicación.

## 14. Inventario de activos y documentación técnica

Se entregan 13 activos a nombre de la barbería, todos con licencia libre o plan gratuito salvo las tablets, Supabase Pro y el dominio, y el costo recurrente de operarlos es de unos COP 1,22 millones al año.

### Inventario de activos entregados

| Categoría | Activo | Detalle | Titular final | Costo (COP) |
| --- | --- | --- | --- | --- |
| Hardware | 2 tablets Samsung Galaxy Tab A9+ | 11", 8 GB de RAM y 128 GB; una por sede para el kiosco de asistencia y la agenda | Barbería | 1.600.000 |
| Nube | Proyecto Supabase de producción | PostgreSQL, Auth, Storage y Edge Functions; plan Pro con copias de seguridad diarias | Barbería | 1.152.489 al año |
| Nube | Proyecto Supabase de pruebas "Filo&Nav" | Referencia `kkdozbodhmrmbhlysypl`, región us-east-1; 14 migraciones, catálogo y datos de demostración | Equipo de desarrollo, como entorno de pruebas | 0 |
| Base de datos | Esquema de SGB-FN | 26 tablas, 4 vistas, 50 políticas RLS, 33 funciones y 3 tareas programadas con pg\_cron | Barbería | Incluido |
| Funciones | 3 Edge Functions | `admin-create-staff`, `delete-my-account`, `process-email-outbox` | Barbería | Incluido |
| Archivos | 3 buckets de Storage | `avatars`, `barbers`, `catalog` | Barbería | Incluido |
| Código | Repositorio `JSRT23/Filo-Navaja` | Rama `main`, commits `43ad9b0`, `b74f324` y `a4716d0`; carpetas `frontend`, `supabase`, `docs` y `scripts` | Barbería, por cesión del contrato | 0 |
| Despliegue | Imagen Docker con nginx | Dockerfile multi-etapa y `docker-compose.yml`; Netlify como alternativa | Barbería | 0 |
| Dominio | .com.co | A registrar a nombre de la barbería | Barbería | 67.997 al año |
| Correo | Servicio transaccional (Resend) | Plan gratuito con dominio verificado | Barbería | 0 |
| Datos | Catálogo inicial | `01_catalogo.sql`: sedes, servicios y productos | Barbería | 0 |
| Cuentas | 15 cuentas de demostración | Un usuario por rol, listadas en el `README.md` del repositorio; se desactivan antes de operar | Equipo de desarrollo | 0 |
| Imágenes | Fotos de productos y barberos | Licencia Unsplash (uso libre), con créditos en el pie del sitio | — | 0 |

Licencias de software: React, Vite, Tailwind CSS, TanStack Query y supabase-js son de código abierto (MIT o Apache 2.0), así que la barbería no paga licencias por usar el código.

### Documentación técnica final

| Documento | Contenido | Ubicación |
| --- | --- | --- |
| Arquitectura | Visión general con diagrama, decisiones clave, roles y trazabilidad de RF y RNF | `docs/01-arquitectura.md` |
| Modelo de datos | Diagrama entidad-relación, tablas, vistas, estados de cita y movimientos de inventario | `docs/02-modelo-de-datos.md` |
| Seguridad | Principios, matriz de permisos por rol, kiosco, datos personales, auditoría y recomendaciones para producción | `docs/03-seguridad.md` |
| API | Funciones RPC y vistas con ejemplos | `docs/04-api.md` |
| Despliegue | 12 pasos para publicar en Supabase Cloud, verificación final y cambios futuros al esquema (procedimiento de mantenimiento) | `docs/05-despliegue.md` |
| Pruebas | Las 97 pruebas, cómo correrlas y qué verifican | `docs/06-pruebas.md` |
| README del proyecto y del frontend | Módulos, estructura, arranque en local con Docker y paleta de diseño | `README.md`, `frontend/README.md` |
| Guía rápida por rol | Pasos de uso para cliente, recepción, barbero y administrador | Anexo A |

El sistema no tiene red propia: usa la fibra óptica y el wifi que ya tienen las dos sedes, de modo que no hay diagrama de red para entregar. La arquitectura de software está en el diagrama del documento 1 y se resume en el siguiente dibujo.

### Arquitectura de la solución

&#91;embedded content: arquitectura de SGB-FN · clientes, Supabase, Postgres y correo\]

Los clientes hablan solo con los servicios de Supabase. Las reglas críticas viven en Postgres, y los correos salen por una cola que una Edge Function envía a Resend; si el envío falla, se reintenta sin perder la reserva.

## 15. Conclusiones y recomendaciones

El proyecto cumplió su propósito: entregó un sistema que reúne reservas, asistencia, inventario, caja y comisiones de las dos sedes, a un costo 9,4 % menor al aprobado y con una recuperación de la inversión estimada en poco más de 10 meses.

### Conclusiones

1. **Alcance y calidad.** Se entregaron los 16 requerimientos funcionales; la seguridad por rol se verificó con 97 pruebas y 50 políticas RLS, y los dos defectos más serios los atrapó la batería de pruebas antes de llegar a un usuario.
2. **Costo.** El gasto final de COP 18.550.486 queda por debajo de la línea base (COP 18.620.000) y la contingencia de COP 1.862.000 no se usó. El ahorro vino del contrato de precio fijo y de un dólar a COP 3.228 en lugar de 4.000.
3. **Tiempo.** El producto estuvo listo 44 días antes de lo planeado; la fecha de producción no se movió por la temporada alta y la llegada de las tablets, no por falta de avance.
4. **Valor para el negocio.** La barbería opera con un margen de referencia de 5,3 %, así que recuperar COP 1,83 millones al mes equivale al 78 % de su resultado actual. Incluso si solo se logra la mitad, la inversión se recupera en unos 21 meses.
5. **El riesgo que queda es humano.** Los barberos son el grupo con menor satisfacción en la encuesta de referencia (4,3) y de ellos depende que la asistencia y las comisiones tengan datos confiables.
6. **Competencias del curso.** *Saber:* se caracterizó la necesidad con datos de la operación (18 % de inasistencias, 12 horas administrativas). *Ser:* se aplicaron ISO/IEC 25010, la Ley 1581 de 2012 y un registro de riesgos con 13 elementos. *Hacer:* se propuso, construyó y cerró una solución de TI para una necesidad organizacional.

### Principales aprendizajes

- La base de datos es el mejor lugar para las reglas que no deben romperse.
- Los cambios visuales se confirman con una imagen antes de aplicarlos a todo el sitio.
- Un presupuesto en dólares necesita un rango de tasa de cambio, no un solo valor.

### Recomendaciones

| Prioridad | Recomendación | Responsable | Plazo |
| --- | --- | --- | --- |
| Alta | Aceptar o corregir las tres desviaciones pendientes (TypeScript, pruebas unitarias del frontend y prototipo Figma) | Andrés Rincón con Juan Ramos Torralvo | Antes de firmar el acta |
| Alta | Guardar las pruebas de extremo a extremo en el repositorio y correrlas en cada pull request | Juan Burgos | Febrero de 2027 |
| Alta | Medir con Lighthouse en 4G (RNF02) y registrar la disponibilidad mensual (RNF04) | Irwin Cardona | Primer mes de operación |
| Media | Revisar con los barberos los comentarios de la encuesta y las comisiones de la primera quincena | Laura Méndez | Febrero de 2027 |
| Media | Revisar el costo de Supabase y la TRM cada trimestre | Irwin Cardona | Trimestral |
| Media | Medir los 5 indicadores de beneficio y comparar con la línea base | Laura Méndez | Meses 1 a 6 |
| Baja | Evaluar una fase 2 del producto: WhatsApp API, fidelización y tercera sede | Andrés Rincón | Segundo semestre de 2027 |

## 16. Anexos y evidencias

### Anexo A. Guía rápida por rol

| Rol | Qué hace | Pasos |
| --- | --- | --- |
| Cliente | Reserva, cambia o cancela su turno | 1. Entrar a "Reservar turno" y registrarse aceptando el tratamiento de datos. 2. Elegir sede, servicio, barbero y hora libre. 3. Confirmar y revisar el correo. 4. Cambiar o cancelar en "Mis citas" hasta 2 horas antes. 5. Eliminar la cuenta desde "Mi perfil" si lo desea |
| Recepción | Agenda, cobra y controla inventario de su sede | 1. Entrar con su correo. 2. Ver la agenda del día por silla. 3. Crear citas por teléfono o WhatsApp y registrar clientes sin cita. 4. Cobrar servicios y productos (descuento máximo de 20 %). 5. Registrar entradas de mercancía y revisar los productos con stock bajo |
| Barbero | Marca asistencia y consulta su agenda y comisiones | 1. Marcar entrada y salida con su PIN en la tablet de la sede. 2. Ver su agenda del día. 3. Consultar solo sus comisiones de la quincena |
| Administrador | Controla el negocio de ambas sedes | 1. Revisar el panel de ingresos, ocupación, inasistencias y productos más vendidos. 2. Crear personal y definir horarios. 3. Editar catálogo y precios. 4. Cerrar la quincena de comisiones. 5. Anular ventas y exportar el CSV de ventas para el contador |

### Anexo B. Formatos de capacitación

**Lista de asistencia.** Registro de las cinco sesiones de capacitación, con los 24 asistentes previstos.

| Sesión y fecha | Sede | Nombre | Cargo | Documento | Firma |
| --- | --- | --- | --- | --- | --- |
| Sesión 1, 19/01/2027 | La Castellana | Carlos Díaz | Barbero | 1.067.912.304 | Firmó |
| Sesión 1, 19/01/2027 | La Castellana | Jhon Mercado | Barbero | 1.003.487.215 | Firmó |
| Sesión 1, 19/01/2027 | La Castellana | Kevin Pacheco | Barbero | 1.071.560.822 | Firmó |
| Sesión 1, 19/01/2027 | La Castellana | Luis Ortega | Barbero | 1.003.215.678 | Firmó |
| Sesión 1, 19/01/2027 | La Castellana | Sebastián Doria | Barbero | 1.067.844.129 | Firmó |
| Sesión 1, 19/01/2027 | La Castellana | Valentina Ortiz | Recepcionista | 1.003.903.457 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Carlos Díaz | Barbero | 1.067.912.304 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Jhon Mercado | Barbero | 1.003.487.215 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Kevin Pacheco | Barbero | 1.071.560.822 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Luis Ortega | Barbero | 1.003.215.678 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Sebastián Doria | Barbero | 1.067.844.129 | Firmó |
| Sesión 2, 21/01/2027 | La Castellana | Valentina Ortiz | Recepcionista | 1.003.903.457 | Firmó |
| Sesión 3, 20/01/2027 | Centro | Brayan Castro | Barbero | 1.003.652.190 | Firmó |
| Sesión 3, 20/01/2027 | Centro | Daniel Lora | Barbero | 1.067.738.451 | Firmó |
| Sesión 3, 20/01/2027 | Centro | Miguel Hoyos | Barbero | 1.072.410.936 | Firmó |
| Sesión 3, 20/01/2027 | Centro | Yeison Martínez | Barbero | 1.003.118.762 | Firmó |
| Sesión 3, 20/01/2027 | Centro | Daniela Pérez | Recepcionista | 1.003.774.508 | Firmó |
| Sesión 4, 22/01/2027 | Centro | Brayan Castro | Barbero | 1.003.652.190 | Firmó |
| Sesión 4, 22/01/2027 | Centro | Daniel Lora | Barbero | 1.067.738.451 | Firmó |
| Sesión 4, 22/01/2027 | Centro | Miguel Hoyos | Barbero | 1.072.410.936 | Firmó |
| Sesión 4, 22/01/2027 | Centro | Yeison Martínez | Barbero | 1.003.118.762 | Firmó |
| Sesión 4, 22/01/2027 | Centro | Daniela Pérez | Recepcionista | 1.003.774.508 | Firmó |
| Sesión 5, 23/01/2027 | Ambas sedes | Laura Méndez | Administradora | 1.063.295.047 | Firmó |
| Sesión 5, 23/01/2027 | Ambas sedes | Andrés Rincón | Propietario | 78.742.318 | Firmó |

**Constancia de capacitación.** "Se certifica que Jhon Mercado recibió 4 horas de capacitación en el uso del Sistema de Gestión de Barbería Filo & Navaja, en el rol de barbero, los días 19 y 21 de enero de 2027. Firman el director del proyecto, Juan Ramos Torralvo, y la administradora, Laura Méndez." Se expide una constancia con este mismo texto a cada asistente.

### Anexo C. Evidencias técnicas

| Evidencia | Detalle |
| --- | --- |
| `43ad9b0`, 27 oct 2026 12:59 | Proyecto Filo & Navaja: backend en Supabase y frontend React + Vite |
| `b74f324`, 27 oct 2026 13:06 | Navegación, encabezados y pie en negro con dorado; fotos reales y ajustes |
| `a4716d0`, 4 nov 2026 19:12 | Arreglo del menú móvil y último módulo |
| `ddc0b5d`, 9 nov 2026 | Despliegue final: revisión de seguridad, correos reales con Resend y 97 pruebas |
| 14 migraciones | Del 26 al 27 de octubre de 2026, en `supabase/migrations/` |
| 97 pruebas SQL | `scripts/test/sql/01_seguridad_y_flujos.sql`; terminan con "Todas las pruebas pasaron" |
| Aplicación en línea | <https://filo-navaja.vercel.app> |
| Cuentas de demostración | 15 cuentas, una por rol, listadas en el `README.md` del repositorio |
| Documentos de Fase 1 y 2 | Fase1\_Barberia\_Filo\_y\_Navaja.docx y Fase2\_Planeacion\_Barberia\_Filo\_y\_Navaja.docx |

### Anexo D. Fuentes y supuestos

Consultadas el 9 de noviembre de 2026.

| Dato | Valor usado | Fuente |
| --- | --- | --- |
| TRM | COP 3.228,26 (6 nov 2026) | [dolar-colombia.com](https://www.dolar-colombia.com/2026-11-06) |
| Salario mínimo 2026 | COP 1.750.905, más auxilio de transporte de COP 249.095 (decretos 1469 y 1470 de 2025) | [Consultorsalud](https://consultorsalud.com/aumento-del-salario-minimo-en-colombia-2026/) |
| Supabase Pro | USD 25 al mes, 8 GB de base de datos, 100 GB de archivos, 100.000 usuarios activos | [Toolradar](https://toolradar.com/blog/supabase-pricing-2026); la página oficial de precios no estuvo disponible |
| Dominio .com.co | USD 17,70 al año | [Dynadot](https://www.dynadot.com/es/dominio/com.co) |
| Tablet | Samsung Galaxy Tab A9+ Wi-Fi, 11", 8 GB y 128 GB | [Samsung Colombia](https://www.samsung.com/co/tablets/galaxy-tab-a/galaxy-tab-a9-plus-wifi-mystic-silver-128gb-sm-x210nzsecoo/); el precio no se pudo leer |
| Precios de cortes en Montería | Corte de adulto desde COP 18.000; corte con barba COP 25.000; perfilado COP 14.000 | [Fresha](https://www.fresha.com/a/johns-barberclub-monteria-carrera-28-9-2-llrg5gf7) |
| Costos de un local | Arriendo de COP 2,5 a 5 millones, servicios de COP 350.000 a 600.000, insumos de COP 500.000 a 800.000 al mes | [Modelos de plan de negocios](https://modelosdeplandenegocios.com/blogs/news/cuanto-cuesta-montar-barberia-colombia) |
| Ingreso de un barbero | COP 0,9 a 2,2 millones al mes (Talent.com, 2024) | [Pulzo](https://www.pulzo.com/economia/cuanto-gana-barbero-peluquero-estilista-colombia-2024-PP4048755) |
| Mercado de barberías | US$283 millones al año en Colombia; cortes desde COP 35.000 en barberías reconocidas (datos de 2018) | [La República](https://www.larepublica.co/ocio/el-auge-de-las-barberias-mueve-us280-millones-al-ano-en-colombia-2766025) |
| Software de agenda comercial | Recordatorios por WhatsApp desde COP 10.000 al mes y facturación electrónica desde COP 90.000 al mes; el precio base del plan no se muestra | [AgendaPro Colombia](https://agendapro.com/co/planes-int) |
| Salario de desarrolladores júnior | USD 950 a 1.155 al mes (≈ COP 3,1 a 3,7 millones a TRM 3.228), coherente con las tarifas de COP 20.000 a 30.000 por hora de la Fase 1 | [Talently](https://talently.tech/herramientas/colombia/salario/developer/fullstack-developer), [Portafolio](https://www.portafolio.co/economia/empleo/cuanto-gana-un-desarrollador-de-software-en-colombia-627749) |

**Supuestos que debe confirmar la barbería:** IVA del 19 % sobre Supabase y el dominio; exoneración de aportes del artículo 114-1 del Estatuto Tributario para el costo del personal; arriendo de COP 3,5 y 3,0 millones; precio de las tablets de COP 800.000 cada una; ventas de productos no incluidas en el estado de resultados.
