-- =====================================================================
-- 0900 · Almacenamiento de imágenes (Supabase Storage)
--   avatars  → foto de perfil de cada usuario:  avatars/<user_id>/foto.webp
--   barbers  → fotos de los barberos:            barbers/<barber_id>/foto.webp
--   catalog  → servicios, productos y sedes:     catalog/services/…, catalog/products/…
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('barbers', 'barbers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "storage: lectura pública de imágenes"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'barbers', 'catalog'));

-- Cada usuario gestiona solo su carpeta de avatar
create policy "storage: el usuario sube su avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "storage: el usuario actualiza su avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "storage: el usuario borra su avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Fotos de barberos: admin, o el propio barbero en su carpeta
create policy "storage: fotos de barberos"
  on storage.objects for all to authenticated
  using (bucket_id = 'barbers' and ((select public.is_admin())
         or (storage.foldername(name))[1] = (select public.current_barber_id())::text))
  with check (bucket_id = 'barbers' and ((select public.is_admin())
         or (storage.foldername(name))[1] = (select public.current_barber_id())::text));

-- Catálogo: solo admin
create policy "storage: catálogo lo gestiona admin"
  on storage.objects for all to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));
