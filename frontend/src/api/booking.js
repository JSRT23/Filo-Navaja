import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rpc, supabase, unwrap } from '@/lib/supabase';
import { toISODate } from '@/lib/format';

export function useAvailableDates({ serviceId, branchId, barberId, days = 21 }) {
  return useQuery({
    queryKey: ['public', 'dates', serviceId, branchId, barberId ?? 'any', days],
    enabled: Boolean(serviceId && branchId),
    staleTime: 60 * 1000,
    queryFn: () =>
      rpc('get_available_dates', {
        p_service_id: serviceId,
        p_branch_id: branchId,
        p_barber_id: barberId ?? null,
        p_days: days,
      }),
  });
}

/** Horarios libres de una sede para un servicio y una fecha (todos los barberos) */
export function useBranchAvailability({ branchId, serviceId, date }) {
  return useQuery({
    queryKey: ['public', 'availability', branchId, serviceId, date],
    enabled: Boolean(branchId && serviceId && date),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: () => rpc('get_branch_availability', { p_branch_id: branchId, p_service_id: serviceId, p_date: date }),
  });
}

/** Horarios de un barbero (para reprogramar se ignora la propia cita) */
export function useBarberSlots({ barberId, serviceId, date, ignoreId }) {
  return useQuery({
    queryKey: ['public', 'slots', barberId, serviceId, date, ignoreId ?? null],
    enabled: Boolean(barberId && serviceId && date),
    staleTime: 30 * 1000,
    queryFn: () =>
      rpc('get_available_slots', {
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_date: date,
        p_ignore_appointment_id: ignoreId ?? null,
      }),
  });
}

/** Próximo turno libre de la sede para un servicio */
export function useNextFreeSlot(branchId, serviceId) {
  return useQuery({
    queryKey: ['public', 'next-slot', branchId, serviceId],
    enabled: Boolean(branchId && serviceId),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    queryFn: async () => {
      const dates = await rpc('get_available_dates', { p_service_id: serviceId, p_branch_id: branchId, p_barber_id: null, p_days: 7 });
      const first = dates?.[0];
      if (!first) return null;
      const slots = await rpc('get_branch_availability', { p_branch_id: branchId, p_service_id: serviceId, p_date: first.available_on });
      const slot = slots?.[0];
      return slot ? { ...slot, date: first.available_on } : null;
    },
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ barberId, serviceId, startsAt, notes }) =>
      rpc('book_appointment', {
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_starts_at: startsAt,
        p_customer_notes: notes || null,
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['public', 'availability'] });
      qc.invalidateQueries({ queryKey: ['public', 'dates'] });
      qc.invalidateQueries({ queryKey: ['public', 'next-slot'] });
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
    },
  });
}

/** Citas del cliente autenticado */
export function useMyAppointments(customerId) {
  return useQuery({
    queryKey: ['my-appointments', customerId],
    enabled: Boolean(customerId),
    queryFn: async () =>
      unwrap(
        await supabase.from('v_appointments').select('*').eq('customer_id', customerId).order('starts_at', { ascending: false }).limit(100),
      ),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => rpc('cancel_appointment', { p_appointment_id: id, p_reason: reason || null }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['agenda'] });
      qc.invalidateQueries({ queryKey: ['public', 'availability'] });
    },
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startsAt, barberId }) =>
      rpc('reschedule_appointment', { p_appointment_id: id, p_new_starts_at: startsAt, p_new_barber_id: barberId ?? null }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['agenda'] });
      qc.invalidateQueries({ queryKey: ['public'] });
    },
  });
}

/** Agrupa horarios por franja del día */
export function groupSlotsByPeriod(slots = []) {
  const groups = { Mañana: [], Tarde: [], Noche: [] };
  for (const s of slots) {
    const h = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }).format(new Date(s.slot_start)),
    );
    const key = h < 12 ? 'Mañana' : h < 17 ? 'Tarde' : 'Noche';
    groups[key].push(s);
  }
  return Object.entries(groups).filter(([, list]) => list.length);
}

export const isToday = (iso) => iso === toISODate(new Date());
