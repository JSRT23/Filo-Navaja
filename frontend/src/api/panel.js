// Datos del panel del personal. La RLS de Supabase decide qué ve cada rol;
// aquí solo se filtra por sede y fecha para no traer más de lo necesario.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { realtimeEnabled, rpc, supabase, unwrap, publicUrl } from '@/lib/supabase';

/** Invalida las consultas indicadas cuando cambia una tabla (Realtime) */
export function useRealtime(table, filter, keys, enabled = true) {
  const qc = useQueryClient();
  const serialized = JSON.stringify(keys);
  useEffect(() => {
    if (!realtimeEnabled || !enabled) return undefined;
    const channel = supabase
      .channel(`rt-${table}-${filter ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => {
        JSON.parse(serialized).forEach((key) => qc.invalidateQueries({ queryKey: key }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, serialized, enabled, qc]);
}

// ------------------------------------------------------------ Panel KPIs
export function useDashboard({ from, to, branchId }, { enabled = true } = {}) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', from, to, branchId ?? 'all'],
    queryFn: () => rpc('dashboard_summary', { p_from: from, p_to: to, p_branch_id: branchId ?? null }),
  });
}

export function useLowStock(branchId, { enabled = true } = {}) {
  return useQuery({
    enabled,
    queryKey: ['low-stock', branchId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('v_low_stock').select('*').order('missing', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      return unwrap(await q);
    },
  });
}

// ----------------------------------------------------------------- Agenda
export function useAgenda({ branchId, date, barberId }) {
  return useQuery({
    queryKey: ['agenda', branchId, date, barberId ?? 'all'],
    enabled: Boolean(branchId && date),
    queryFn: async () => {
      let q = supabase.from('v_appointments').select('*').eq('branch_id', branchId).eq('local_date', date).order('starts_at');
      if (barberId) q = q.eq('barber_id', barberId);
      return unwrap(await q);
    },
  });
}

/** Próximas citas de un barbero (vista de lista) */
export function useBarberUpcoming(barberId, fromDate, toDate) {
  return useQuery({
    queryKey: ['agenda', 'barber', barberId, fromDate, toDate],
    enabled: Boolean(barberId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('v_appointments')
          .select('*')
          .eq('barber_id', barberId)
          .gte('local_date', fromDate)
          .lte('local_date', toDate)
          .order('starts_at'),
      ),
  });
}

/** Barberos de la sede con horario y servicios (vista del personal: incluye inactivos si se pide) */
export function useStaffBarbers(branchId, { includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['staff-barbers', branchId ?? 'all', includeInactive],
    queryFn: async () => {
      let q = supabase
        .from('barbers')
        .select(
          '*, barber_schedules(*), barber_services(service_id), barber_compensation(*), profile:profiles(id, full_name, email, phone, is_active)',
        )
        .order('sort_order');
      if (branchId) q = q.eq('branch_id', branchId);
      if (!includeInactive) q = q.eq('is_active', true);
      const rows = unwrap(await q);
      return rows.map((b) => ({
        ...b,
        photo: publicUrl('barbers', b.photo_url),
        serviceIds: (b.barber_services ?? []).map((s) => s.service_id),
        compensation: Array.isArray(b.barber_compensation) ? b.barber_compensation[0] : b.barber_compensation,
      }));
    },
  });
}

function invalidateAgenda(qc) {
  qc.invalidateQueries({ queryKey: ['agenda'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['public', 'availability'] });
  qc.invalidateQueries({ queryKey: ['public', 'dates'] });
  qc.invalidateQueries({ queryKey: ['public', 'next-slot'] });
  qc.invalidateQueries({ queryKey: ['pending-checkout'] });
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => rpc('set_appointment_status', { p_appointment_id: id, p_status: status }),
    onSettled: () => invalidateAgenda(qc),
  });
}

export function useUpdateAppointmentNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, internal_notes }) => unwrap(await supabase.from('appointments').update({ internal_notes }).eq('id', id)),
    onSettled: () => invalidateAgenda(qc),
  });
}

export function useStaffCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, barberId, serviceId, startsAt, source, notes }) =>
      rpc('staff_create_appointment', {
        p_customer_id: customerId,
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_starts_at: startsAt,
        p_source: source,
        p_internal_notes: notes || null,
      }),
    onSettled: () => invalidateAgenda(qc),
  });
}

// --------------------------------------------------------------- Clientes
export function useCustomerSearch(term, { limit = 30 } = {}) {
  const clean = term.trim().replace(/[%,()]/g, ' ');
  return useQuery({
    queryKey: ['customers', clean, limit],
    queryFn: async () => {
      let q = supabase.from('customers').select('*').eq('is_anonymized', false).order('created_at', { ascending: false }).limit(limit);
      if (clean) {
        const digits = clean.replace(/\D/g, '');
        const ors = [`full_name.ilike.%${clean}%`, `email.ilike.%${clean}%`];
        if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
        q = q.or(ors.join(','));
      }
      return unwrap(await q);
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomerHistory(customerId) {
  return useQuery({
    queryKey: ['customer-history', customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const [appointments, sales] = await Promise.all([
        supabase.from('v_appointments').select('*').eq('customer_id', customerId).order('starts_at', { ascending: false }).limit(50),
        supabase
          .from('sales')
          .select('id, number, total, payment_method, status, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      return { appointments: unwrap(appointments), sales: unwrap(sales) };
    },
  });
}

export function useUpsertCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fullName, phone, email, consent, notes }) =>
      rpc('staff_upsert_customer', {
        p_full_name: fullName,
        p_phone: phone || null,
        p_email: email || null,
        p_data_consent: Boolean(consent),
        p_notes: notes || null,
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }) => unwrap(await supabase.from('customers').update(patch).eq('id', id).select().single()),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useAnonymizeCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => rpc('anonymize_customer', { p_customer_id: id }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ------------------------------------------------------------------- Caja
/** Citas del día que todavía no se han cobrado */
export function usePendingCheckout(branchId, date) {
  return useQuery({
    queryKey: ['pending-checkout', branchId, date],
    enabled: Boolean(branchId && date),
    queryFn: async () => {
      const [appts, sales] = await Promise.all([
        supabase
          .from('v_appointments')
          .select('*')
          .eq('branch_id', branchId)
          .eq('local_date', date)
          .in('status', ['confirmed', 'pending', 'in_progress', 'completed'])
          .order('starts_at'),
        supabase
          .from('sales')
          .select('appointment_id')
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .not('appointment_id', 'is', null)
          .gte('created_at', `${date}T00:00:00-05:00`),
      ]);
      const paid = new Set(unwrap(sales).map((s) => s.appointment_id));
      return unwrap(appts).filter((a) => !paid.has(a.id));
    },
  });
}

export function useSales(branchId, date) {
  return useQuery({
    queryKey: ['sales', branchId, date],
    enabled: Boolean(branchId && date),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('sales')
          .select(
            '*, customer:customers(full_name, phone), items:sale_items(id, item_type, description, quantity, unit_price, line_total, barber:barbers(display_name))',
          )
          .eq('branch_id', branchId)
          .gte('created_at', `${date}T00:00:00-05:00`)
          .lt('created_at', `${date}T23:59:59.999-05:00`)
          .order('created_at', { ascending: false }),
      ),
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, paymentMethod, items, customerId, appointmentId, discount, notes }) =>
      rpc('create_sale', {
        p_branch_id: branchId,
        p_payment_method: paymentMethod,
        p_items: items,
        p_customer_id: customerId ?? null,
        p_appointment_id: appointmentId ?? null,
        p_discount: discount || 0,
        p_notes: notes || null,
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      invalidateAgenda(qc);
    },
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => rpc('void_sale', { p_sale_id: id, p_reason: reason }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ------------------------------------------------------------- Inventario
export function useStock(branchId) {
  return useQuery({
    queryKey: ['stock', branchId],
    enabled: Boolean(branchId),
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('products')
          .select(
            'id, sku, name, brand, price, cost, min_stock, is_active, category:product_categories(name), product_stock(branch_id, quantity)',
          )
          .order('name'),
      );
      return rows.map((p) => {
        const qty = p.product_stock?.find((s) => s.branch_id === branchId)?.quantity ?? 0;
        return { ...p, quantity: qty, price: Number(p.price), cost: Number(p.cost), low: qty <= p.min_stock };
      });
    },
  });
}

export function useMovements(branchId, productId) {
  return useQuery({
    queryKey: ['movements', branchId, productId ?? 'all'],
    enabled: Boolean(branchId),
    queryFn: async () => {
      let q = supabase
        .from('inventory_movements')
        .select('*, product:products(name, sku), author:profiles(full_name)')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (productId) q = q.eq('product_id', productId);
      return unwrap(await q);
    },
  });
}

export function useInventoryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, productId, branchId, toBranchId, quantity, unitCost, notes }) => {
      if (kind === 'entry')
        return rpc('register_stock_entry', {
          p_product_id: productId,
          p_branch_id: branchId,
          p_quantity: quantity,
          p_unit_cost: unitCost ?? null,
          p_notes: notes || null,
        });
      if (kind === 'adjust')
        return rpc('adjust_stock', { p_product_id: productId, p_branch_id: branchId, p_counted_quantity: quantity, p_reason: notes });
      if (kind === 'transfer')
        return rpc('transfer_stock', {
          p_product_id: productId,
          p_from_branch_id: branchId,
          p_to_branch_id: toBranchId,
          p_quantity: quantity,
          p_notes: notes || null,
        });
      if (kind === 'waste')
        return unwrap(
          await supabase
            .from('inventory_movements')
            .insert({ product_id: productId, branch_id: branchId, type: 'waste', quantity: -Math.abs(quantity), notes }),
        );
      throw new Error('Acción de inventario desconocida');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      qc.invalidateQueries({ queryKey: ['public', 'products'] });
    },
  });
}

// ------------------------------------------------------------- Comisiones
export function useFortnight(date) {
  return useQuery({
    queryKey: ['fortnight', date],
    queryFn: async () => (await rpc('get_fortnight', { p_date: date }))?.[0] ?? null,
  });
}

export function useCommissionSummary({ from, to, barberId }) {
  return useQuery({
    queryKey: ['commissions', from, to, barberId ?? 'all'],
    enabled: Boolean(from && to),
    queryFn: () => rpc('commission_summary', { p_from: from, p_to: to, p_barber_id: barberId ?? null }),
  });
}

export function useCommissionPeriods() {
  return useQuery({
    queryKey: ['commission-periods'],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('commission_periods')
          .select('*, statements:commission_statements(*, barber:barbers(display_name))')
          .order('starts_on', { ascending: false })
          .limit(24),
      ),
  });
}

export function useCommissionActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ['commission-periods'] });
    qc.invalidateQueries({ queryKey: ['commissions'] });
  };
  return {
    close: useMutation({
      mutationFn: ({ from, to }) => rpc('close_commission_period', { p_starts_on: from, p_ends_on: to }),
      onSettled: done,
    }),
    markPaid: useMutation({ mutationFn: (id) => rpc('mark_commission_period_paid', { p_period_id: id }), onSettled: done }),
  };
}

// ------------------------------------------------------------- Asistencia
export function useAttendanceReport({ from, to, branchId }) {
  return useQuery({
    queryKey: ['attendance-report', from, to, branchId ?? 'all'],
    enabled: Boolean(from && to),
    queryFn: () => rpc('attendance_report', { p_from: from, p_to: to, p_branch_id: branchId ?? null }),
  });
}

export function useAttendanceLogs({ branchId, from, to, barberId }) {
  return useQuery({
    queryKey: ['attendance-logs', branchId ?? 'all', from, to, barberId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('attendance_logs')
        .select('*, barber:barbers(display_name, photo_url), author:profiles(full_name)')
        .gte('recorded_at', `${from}T00:00:00-05:00`)
        .lte('recorded_at', `${to}T23:59:59.999-05:00`)
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (branchId) q = q.eq('branch_id', branchId);
      if (barberId) q = q.eq('barber_id', barberId);
      return unwrap(await q);
    },
  });
}

export function useManualAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ barberId, type, recordedAt, notes }) =>
      rpc('record_attendance_manual', { p_barber_id: barberId, p_type: type, p_recorded_at: recordedAt, p_notes: notes }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['attendance-logs'] });
      qc.invalidateQueries({ queryKey: ['attendance-report'] });
      qc.invalidateQueries({ queryKey: ['kiosk'] });
    },
  });
}

// ----------------------------------------------------------------- Kiosco
export function useKioskBoard(branchId) {
  return useQuery({
    queryKey: ['kiosk', branchId],
    enabled: Boolean(branchId),
    refetchInterval: 30 * 1000,
    queryFn: () => rpc('get_kiosk_board', { p_branch_id: branchId }),
  });
}

export function useRegisterAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ barberId, pin }) => rpc('register_attendance', { p_barber_id: barberId, p_pin: pin }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['kiosk'] });
      qc.invalidateQueries({ queryKey: ['attendance-logs'] });
    },
  });
}
