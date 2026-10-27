-- =====================================================================
-- 01_catalogo.sql · Catálogo base del negocio
-- Sedes, horarios, cierres, categorías, servicios y productos.
-- Sirve para desarrollo (supabase db reset) y también para producción:
-- en producción ejecútalo una vez desde el SQL Editor y ajusta precios.
-- =====================================================================

-- ============================================================ SEDES ===
insert into public.branches (id, name, slug, address, neighborhood, city, phone, whatsapp, email, latitude, longitude) values
  ('b1000000-0000-4000-8000-000000000001', 'Filo & Navaja La Castellana', 'la-castellana',
   'Cra. 6 #62-15', 'La Castellana', 'Montería', '+57 604 789 1020', '+57 300 000 1020', 'castellana@filoynavaja.co', 8.773000, -75.866000),
  ('b1000000-0000-4000-8000-000000000002', 'Filo & Navaja Centro', 'centro',
   'Calle 30 #3-42', 'Centro', 'Montería', '+57 604 789 1030', '+57 300 000 1030', 'centro@filoynavaja.co', 8.750000, -75.881000);

insert into public.branch_hours (branch_id, weekday, opens_at, closes_at, is_closed)
select b.id, d,
       case when d = 0 then time '10:00' else time '09:00' end,
       case when d = 0 then time '16:00' else time '20:00' end,
       false
from public.branches b cross join generate_series(0, 6) d;

insert into public.branch_closures (branch_id, closed_on, reason) values
  (null, '2026-12-25', 'Navidad'),
  (null, '2027-01-01', 'Año Nuevo');

-- ========================================================= CATÁLOGO ===
insert into public.service_categories (id, name, slug, description, sort_order) values
  ('c1000000-0000-4000-8000-000000000001', 'Cortes',       'cortes',       'Cortes clásicos y modernos a tijera y máquina', 1),
  ('c1000000-0000-4000-8000-000000000002', 'Barba',        'barba',        'Arreglo, perfilado y afeitado clásico', 2),
  ('c1000000-0000-4000-8000-000000000003', 'Combos',       'combos',       'Servicios combinados con mejor precio', 3),
  ('c1000000-0000-4000-8000-000000000004', 'Tratamientos', 'tratamientos', 'Cuidado facial y capilar', 4),
  ('c1000000-0000-4000-8000-000000000005', 'Niños',        'ninos',        'Cortes para niños hasta 12 años', 5);

insert into public.services (id, category_id, name, slug, description, duration_minutes, price, is_featured, sort_order) values
  ('5e000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Corte clásico', 'corte-clasico',
   'Corte a tijera y máquina con acabado a navaja en patillas y nuca.', 30, 20000, false, 1),
  ('5e000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Corte degradado (fade)', 'corte-degradado',
   'Low, mid o high fade con transición limpia y definición de contornos.', 45, 25000, true, 2),
  ('5e000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'Diseño freestyle', 'diseno-freestyle',
   'Líneas y figuras a navaja. Se agrega a cualquier corte.', 15, 8000, false, 3),
  ('5e000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002', 'Arreglo de barba', 'arreglo-de-barba',
   'Perfilado, rebaje y definición con navaja y toalla caliente.', 30, 15000, false, 1),
  ('5e000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002', 'Afeitado clásico', 'afeitado-clasico',
   'Ritual completo con toalla caliente, espuma tradicional y bálsamo.', 40, 22000, false, 2),
  ('5e000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002', 'Perfilado de cejas', 'perfilado-de-cejas',
   'Limpieza y definición de cejas a navaja.', 10, 8000, false, 3),
  ('5e000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000002', 'Tinte de barba', 'tinte-de-barba',
   'Cobertura de canas con tono natural.', 30, 25000, false, 4),
  ('5e000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000003', 'Corte + barba', 'corte-y-barba',
   'El combo más pedido: corte a elección y arreglo de barba.', 60, 35000, true, 1),
  ('5e000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000003', 'Experiencia Filo & Navaja', 'experiencia-filo-navaja',
   'Corte, barba, limpieza facial con mascarilla negra y bebida de cortesía.', 90, 60000, true, 2),
  ('5e000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000004', 'Limpieza facial con mascarilla negra', 'limpieza-facial',
   'Exfoliación, mascarilla negra y vapor para piel grasa.', 30, 25000, false, 1),
  ('5e000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000004', 'Tratamiento capilar hidratante', 'tratamiento-capilar',
   'Hidratación profunda con masaje capilar.', 30, 30000, false, 2),
  ('5e000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000005', 'Corte niño', 'corte-nino',
   'Corte para niños hasta 12 años, con paciencia y buen ambiente.', 30, 15000, false, 1);

insert into public.product_categories (id, name, slug, sort_order) values
  ('ca000000-0000-4000-8000-000000000001', 'Fijación',        'fijacion',        1),
  ('ca000000-0000-4000-8000-000000000002', 'Barba',           'barba',           2),
  ('ca000000-0000-4000-8000-000000000003', 'Cuidado capilar', 'cuidado-capilar', 3),
  ('ca000000-0000-4000-8000-000000000004', 'Afeitado',        'afeitado',        4);

insert into public.products (id, category_id, sku, name, brand, description, price, cost, min_stock) values
  ('9d000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'FN-POM-100', 'Pomada mate 100 g',         'Filo & Navaja', 'Fijación media, acabado natural sin brillo.', 45000, 22000, 5),
  ('9d000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000001', 'FN-CER-100', 'Cera brillante 100 g',      'Filo & Navaja', 'Fijación fuerte con brillo para peinados clásicos.', 38000, 18000, 5),
  ('9d000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'FN-POL-020', 'Polvo texturizador 20 g',   'Filo & Navaja', 'Volumen y textura instantánea.', 32000, 14000, 4),
  ('9d000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000002', 'FN-ACE-030', 'Aceite para barba 30 ml',   'Filo & Navaja', 'Suaviza e hidrata. Aroma madera y cítricos.', 40000, 17000, 5),
  ('9d000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000002', 'FN-BAL-060', 'Bálsamo para barba 60 g',   'Filo & Navaja', 'Controla el volumen y da forma.', 42000, 19000, 4),
  ('9d000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000002', 'FN-SHB-120', 'Shampoo para barba 120 ml', 'Filo & Navaja', 'Limpieza suave sin resecar.', 30000, 12000, 4),
  ('9d000000-0000-4000-8000-000000000007', 'ca000000-0000-4000-8000-000000000003', 'FN-SHA-300', 'Shampoo anticaspa 300 ml',  'Filo & Navaja', 'Con piroctona olamina y mentol.', 35000, 15000, 4),
  ('9d000000-0000-4000-8000-000000000008', 'ca000000-0000-4000-8000-000000000003', 'FN-MIN-060', 'Minoxidil cosmético 5 % 60 ml', 'Genérico',  'Uso cosmético para barba y cabello.', 65000, 34000, 6),
  ('9d000000-0000-4000-8000-000000000009', 'ca000000-0000-4000-8000-000000000004', 'FN-AFT-100', 'Loción aftershave 100 ml',  'Filo & Navaja', 'Calma la piel después del afeitado.', 36000, 15000, 3),
  ('9d000000-0000-4000-8000-000000000010', 'ca000000-0000-4000-8000-000000000004', 'FN-PEI-001', 'Peine de madera',           'Filo & Navaja', 'Peine antiestático de madera de sándalo.', 15000, 5000, 3);
