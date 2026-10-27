// Mutaciones de administración: catálogo, personal y configuración
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction, rpc, supabase, unwrap } from '@/lib/supabase';

export function slugify(text = '') {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'y')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Sube una imagen a un bucket y devuelve la ruta guardada */
export async function uploadImage(bucket, folder, file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Usa una imagen JPG, PNG o WEBP');
  if (file.size > 3 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 3 MB');
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${folder}/${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type }));
  return path;
}

// ----------------------------------------------------------- Catálogo
export function useAdminCatalog() {
  return useQuery({
    queryKey: ['admin-catalog'],
    queryFn: async () => {
      const [services, serviceCategories, products, productCategories] = await Promise.all([
        supabase.from('services').select('*, category:service_categories(name)').order('sort_order'),
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('products').select('*, category:product_categories(name)').order('name'),
        supabase.from('product_categories').select('*').order('sort_order'),
      ]);
      return {
        services: unwrap(services),
        serviceCategories: unwrap(serviceCategories),
        products: unwrap(products),
        productCategories: unwrap(productCategories),
      };
    },
  });
}

export function useSaveRow(table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const q = id ? supabase.from(table).update(values).eq('id', id) : supabase.from(table).insert(values);
      return unwrap(await q.select().single());
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['staff-barbers'] });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });
}

// ------------------------------------------------------------ Personal
export function useStaffProfiles() {
  return useQuery({
    queryKey: ['staff-profiles'],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, branch_id, is_active, created_at, avatar_url')
          .in('role', ['admin', 'receptionist', 'barber'])
          .order('role')
          .order('full_name'),
      ),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => invokeFunction('admin-create-staff', body),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['staff-profiles'] });
      qc.invalidateQueries({ queryKey: ['staff-barbers'] });
      qc.invalidateQueries({ queryKey: ['public', 'barbers'] });
    },
  });
}

export function useSaveBarber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ barber, schedules, serviceIds, compensation, pin }) => {
      const { id, ...fields } = barber;
      unwrap(await supabase.from('barbers').update(fields).eq('id', id));

      if (schedules) {
        const keep = schedules.filter((s) => s.enabled);
        const drop = schedules.filter((s) => !s.enabled).map((s) => s.weekday);
        if (drop.length) unwrap(await supabase.from('barber_schedules').delete().eq('barber_id', id).in('weekday', drop));
        if (keep.length) {
          unwrap(
            await supabase.from('barber_schedules').upsert(
              keep.map((s) => ({
                barber_id: id,
                weekday: s.weekday,
                start_time: s.start_time,
                end_time: s.end_time,
                break_start: s.break_start || null,
                break_end: s.break_end || null,
              })),
              { onConflict: 'barber_id,weekday' },
            ),
          );
        }
      }

      if (serviceIds) {
        unwrap(await supabase.from('barber_services').delete().eq('barber_id', id));
        if (serviceIds.length)
          unwrap(await supabase.from('barber_services').insert(serviceIds.map((service_id) => ({ barber_id: id, service_id }))));
      }

      if (compensation) {
        unwrap(
          await supabase
            .from('barber_compensation')
            .upsert(
              { barber_id: id, service_commission_rate: compensation.service, product_commission_rate: compensation.product },
              { onConflict: 'barber_id' },
            ),
        );
      }

      if (pin) await rpc('set_barber_pin', { p_barber_id: id, p_pin: pin });
      return id;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['staff-barbers'] });
      qc.invalidateQueries({ queryKey: ['public', 'barbers'] });
      qc.invalidateQueries({ queryKey: ['kiosk'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }) => unwrap(await supabase.from('profiles').update(patch).eq('id', id)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['staff-profiles'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useTimeOff(barberId) {
  return useQuery({
    queryKey: ['time-off', barberId],
    enabled: Boolean(barberId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('barber_time_off')
          .select('*')
          .eq('barber_id', barberId)
          .gte('ends_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .order('starts_at', { ascending: false }),
      ),
  });
}

export function useTimeOffActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ['time-off'] });
    qc.invalidateQueries({ queryKey: ['public'] });
  };
  return {
    add: useMutation({ mutationFn: async (row) => unwrap(await supabase.from('barber_time_off').insert(row)), onSettled: done }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await supabase.from('barber_time_off').delete().eq('id', id)),
      onSettled: done,
    }),
  };
}

// ------------------------------------------------------- Configuración
export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const [settings, branches, closures] = await Promise.all([
        supabase.from('app_settings').select('*').order('key'),
        supabase.from('branches').select('*, branch_hours(*)').order('name'),
        supabase
          .from('branch_closures')
          .select('*')
          .gte('closed_on', new Date(Date.now() - 86400000).toISOString().slice(0, 10))
          .order('closed_on'),
      ]);
      return { settings: unwrap(settings), branches: unwrap(branches), closures: unwrap(closures) };
    },
  });
}

export function useSettingsActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-settings'] });
    qc.invalidateQueries({ queryKey: ['public'] });
  };
  return {
    saveSetting: useMutation({
      mutationFn: async ({ key, value }) => unwrap(await supabase.from('app_settings').update({ value }).eq('key', key)),
      onSettled: done,
    }),
    saveBranch: useMutation({
      mutationFn: async ({ id, hours, ...fields }) => {
        unwrap(await supabase.from('branches').update(fields).eq('id', id));
        if (hours) {
          unwrap(
            await supabase.from('branch_hours').upsert(
              hours.map((h) => ({
                branch_id: id,
                weekday: h.weekday,
                is_closed: h.is_closed,
                opens_at: h.is_closed ? null : h.opens_at,
                closes_at: h.is_closed ? null : h.closes_at,
              })),
              { onConflict: 'branch_id,weekday' },
            ),
          );
        }
      },
      onSettled: done,
    }),
    addClosure: useMutation({ mutationFn: async (row) => unwrap(await supabase.from('branch_closures').insert(row)), onSettled: done }),
    removeClosure: useMutation({
      mutationFn: async (id) => unwrap(await supabase.from('branch_closures').delete().eq('id', id)),
      onSettled: done,
    }),
  };
}
