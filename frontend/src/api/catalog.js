import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap, publicUrl } from '@/lib/supabase';

const LONG = 10 * 60 * 1000;

export function useBranches() {
  return useQuery({
    queryKey: ['public', 'branches'],
    staleTime: LONG,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('branches')
          .select('*, branch_hours(weekday, opens_at, closes_at, is_closed)')
          .eq('is_active', true)
          .order('name'),
      ),
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['public', 'services'],
    staleTime: LONG,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('services')
          .select('*, category:service_categories(id, name, slug, sort_order, description)')
          .eq('is_active', true)
          .order('sort_order'),
      );
      return rows.map((s) => ({ ...s, price: Number(s.price), image: publicUrl('catalog', s.image_url) }));
    },
  });
}

/** Servicios agrupados por categoría, en el orden de la carta */
export function groupByCategory(services = []) {
  const map = new Map();
  for (const s of services) {
    const key = s.category?.id ?? 'otros';
    if (!map.has(key)) map.set(key, { category: s.category ?? { name: 'Otros', sort_order: 999 }, items: [] });
    map.get(key).items.push(s);
  }
  return [...map.values()].sort((a, b) => (a.category.sort_order ?? 0) - (b.category.sort_order ?? 0));
}

export function useBarbers() {
  return useQuery({
    queryKey: ['public', 'barbers'],
    staleTime: LONG,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('barbers')
          .select(
            'id, display_name, bio, specialties, photo_url, instagram, branch_id, calendar_color, accepts_online_booking, sort_order, barber_services(service_id), barber_schedules(weekday, start_time, end_time, break_start, break_end)',
          )
          .eq('is_active', true)
          .order('sort_order'),
      );
      return rows.map((b) => ({
        ...b,
        photo: publicUrl('barbers', b.photo_url),
        serviceIds: (b.barber_services ?? []).map((x) => x.service_id),
      }));
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['public', 'products'],
    staleTime: LONG,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('products')
          .select(
            'id, sku, name, brand, description, price, image_url, category:product_categories(id, name, slug, sort_order), product_stock(branch_id, quantity)',
          )
          .eq('is_active', true)
          .order('name'),
      );
      return rows
        .map((p) => ({ ...p, price: Number(p.price), image: publicUrl('catalog', p.image_url) }))
        .sort((a, b) => (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0));
    },
  });
}

/** Reglas públicas del negocio como objeto { clave: valor } */
export function useSettings() {
  return useQuery({
    queryKey: ['public', 'settings'],
    staleTime: LONG,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('app_settings').select('key, value'));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },
  });
}

/** Cierres programados próximos (festivos, mantenimiento) */
export function useClosures() {
  return useQuery({
    queryKey: ['public', 'closures'],
    staleTime: LONG,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('branch_closures')
          .select('*')
          .gte('closed_on', new Date().toISOString().slice(0, 10))
          .order('closed_on')
          .limit(10),
      ),
  });
}
