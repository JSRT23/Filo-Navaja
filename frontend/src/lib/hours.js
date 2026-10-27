import { WEEK_ORDER, WEEKDAYS } from './constants';
import { clock, TZ } from './format';

/** Hora y día actuales en Bogotá */
export function nowInBogota() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const hh = parts.hour === '24' ? '00' : parts.hour;
  return { weekday, time: `${hh}:${parts.minute}` };
}

const hhmm = (t) => (t ? t.slice(0, 5) : null);

/** Estado de la sede: abierta ahora, abre más tarde, cerrada */
export function openStatus(hours = []) {
  if (!hours.length) return null;
  const byDay = Object.fromEntries(hours.map((h) => [h.weekday, h]));
  const { weekday, time } = nowInBogota();
  const today = byDay[weekday];

  if (today && !today.is_closed) {
    const opens = hhmm(today.opens_at);
    const closes = hhmm(today.closes_at);
    if (time >= opens && time < closes) return { open: true, label: `Abierta, cierra a las ${clock(closes)}` };
    if (time < opens) return { open: false, label: `Abre hoy a las ${clock(opens)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (weekday + i) % 7;
    const h = byDay[d];
    if (h && !h.is_closed) {
      const when = i === 1 ? 'mañana' : `el ${WEEKDAYS[d].toLowerCase()}`;
      return { open: false, label: `Cerrada, abre ${when} a las ${clock(hhmm(h.opens_at))}` };
    }
  }
  return { open: false, label: 'Cerrada' };
}

/**
 * Agrupa días consecutivos con el mismo horario:
 * [{ days: 'Lunes a sábado', range: '9:00 a. m. a 8:00 p. m.' }, …]
 */
export function groupHours(hours = []) {
  const byDay = Object.fromEntries(hours.map((h) => [h.weekday, h]));
  const groups = [];
  for (const d of WEEK_ORDER) {
    const h = byDay[d];
    const range = !h || h.is_closed ? 'Cerrado' : `${clock(hhmm(h.opens_at))} a ${clock(hhmm(h.closes_at))}`;
    const last = groups[groups.length - 1];
    if (last && last.range === range) last.days.push(d);
    else groups.push({ range, days: [d] });
  }
  return groups.map((g) => ({
    range: g.range,
    days: g.days.length === 1 ? WEEKDAYS[g.days[0]] : `${WEEKDAYS[g.days[0]]} a ${WEEKDAYS[g.days[g.days.length - 1]].toLowerCase()}`,
    includesToday: g.days.includes(nowInBogota().weekday),
  }));
}
