// Formatos de Colombia. El negocio opera en America/Bogota (UTC-5, sin horario de verano).
export const TZ = 'America/Bogota';
const LOCALE = 'es-CO';

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export const money = (v) => moneyFmt.format(Number(v || 0)).replace(/\u00a0/g, ' ');
export const number = (v) => numberFmt.format(Number(v || 0));
export const percent = (v, digits = 1) => `${Number(v || 0).toLocaleString(LOCALE, { maximumFractionDigits: digits })} %`;

/** 'YYYY-MM-DD' de hoy en Bogotá */
export function todayISO() {
  return toISODate(new Date());
}

/** Fecha local (Bogotá) de un instante, como 'YYYY-MM-DD' */
export function toISODate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
  return parts; // en-CA ya produce YYYY-MM-DD
}

/** Suma días a una fecha 'YYYY-MM-DD' */
export function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Diferencia en días entre dos fechas 'YYYY-MM-DD' */
export function diffDays(a, b) {
  return Math.round((new Date(`${a}T12:00:00Z`) - new Date(`${b}T12:00:00Z`)) / 86400000);
}

/** Día de la semana (0 = domingo) de una fecha 'YYYY-MM-DD' */
export function weekdayOf(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Instante ISO a partir de fecha y hora locales de Bogotá */
export function localToInstant(dateISO, time) {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateISO}T${t}-05:00`).toISOString();
}

/** Primer día del mes y de la semana (lunes) de una fecha */
export function startOfMonth(iso) {
  return `${iso.slice(0, 7)}-01`;
}
export function endOfMonth(iso) {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export function startOfWeek(iso) {
  const wd = weekdayOf(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

const dateCache = new Map();
function fmt(opts) {
  const key = JSON.stringify(opts);
  if (!dateCache.has(key)) dateCache.set(key, new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...opts }));
  return dateCache.get(key);
}
const asDate = (v) => (v instanceof Date ? v : /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00-05:00`) : new Date(v));
const tidy = (s) => s.replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');

/** 9:30 a. m. */
export const time = (v) => tidy(fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(asDate(v)));
/** lunes, 27 de octubre */
export const longDate = (v) => tidy(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(v)));
/** 27 oct 2026 */
export const shortDate = (v) => tidy(fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(asDate(v))).replace('.', '');
/** 27 oct */
export const dayMonth = (v) => tidy(fmt({ day: 'numeric', month: 'short' }).format(asDate(v))).replace('.', '');
/** oct */
export const monthShort = (v) => tidy(fmt({ month: 'short' }).format(asDate(v))).replace('.', '');
/** lun */
export const weekdayShort = (v) => tidy(fmt({ weekday: 'short' }).format(asDate(v))).replace('.', '');
/** 27/10/2026 9:30 a. m. */
export const dateTime = (v) =>
  tidy(fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(asDate(v)));

/** "Hoy", "Mañana" o "jueves 30 de octubre" */
export function relativeDay(iso) {
  const d = diffDays(iso, todayISO());
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return longDate(iso);
}

/** "09:00:00" → "9:00 a. m." */
export function clock(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Minutos → "1 h 30 min" */
export function duration(mins) {
  const m = Number(mins || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function firstName(name = '') {
  return name.split(/\s+/)[0] || '';
}

/** Teléfono colombiano legible: 300 000 1020 */
export function phone(v) {
  if (!v) return '';
  const digits = String(v).replace(/\D/g, '');
  const local = digits.startsWith('57') && digits.length > 10 ? digits.slice(2) : digits;
  if (local.length === 10) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  return v;
}

/** Enlace de WhatsApp con mensaje */
export function whatsappLink(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const telLink = (v) => `tel:${String(v || '').replace(/[^\d+]/g, '')}`;
