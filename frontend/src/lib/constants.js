export const BRAND = {
  name: 'Filo & Navaja',
  city: 'Montería, Córdoba',
  instagram: 'filoynavaja.mtr',
  email: 'hola@filoynavaja.co',
};

export const ROLE_LABEL = {
  admin: 'Administración',
  receptionist: 'Recepción',
  barber: 'Barbero',
  client: 'Cliente',
};

export const STATUS = {
  pending: { label: 'Pendiente', tone: 'amber' },
  confirmed: { label: 'Confirmada', tone: 'sinu' },
  in_progress: { label: 'En silla', tone: 'brass' },
  completed: { label: 'Atendida', tone: 'steel' },
  cancelled: { label: 'Cancelada', tone: 'pole' },
  no_show: { label: 'No asistió', tone: 'pole' },
};

export const SOURCE_LABEL = {
  online: 'En línea',
  reception: 'Recepción',
  phone: 'Teléfono / WhatsApp',
  walk_in: 'Llegó sin cita',
};

export const PAYMENT = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

export const MOVEMENT_LABEL = {
  purchase: 'Entrada de mercancía',
  sale: 'Venta',
  return: 'Devolución',
  adjustment: 'Ajuste por conteo',
  transfer_in: 'Traslado recibido',
  transfer_out: 'Traslado enviado',
  waste: 'Merma, vencido o dañado',
};

export const TIME_OFF_LABEL = {
  leave: 'Permiso',
  sick: 'Incapacidad',
  vacation: 'Vacaciones',
  other: 'Otro',
};

// 0 = domingo (igual que Postgres extract(dow))
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Orden de la semana colombiana: lunes primero */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const BRANCH_IDS = {
  castellana: 'b1000000-0000-4000-8000-000000000001',
  centro: 'b1000000-0000-4000-8000-000000000002',
};
