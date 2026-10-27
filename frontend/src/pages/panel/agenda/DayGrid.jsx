import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { clock, firstName, time, todayISO, weekdayOf } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/Feedback';
import { CalendarOff } from 'lucide-react';

const PX = 1.4; // píxeles por minuto (84 px por hora)

const toMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function localMinutes(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const STATUS_STYLE = {
  pending: 'bg-amber-50 ring-amber-600/25',
  confirmed: 'bg-white ring-line-strong',
  in_progress: 'bg-brass-300/35 ring-brass-500/50',
  completed: 'bg-paper ring-line text-ink-soft',
  no_show: 'bg-pole-50 ring-pole-100 text-pole-600',
  cancelled: 'bg-paper/70 ring-line text-ink-mute line-through opacity-70',
};

function NowLine({ start, end }) {
  const [now, setNow] = useState(() => localMinutes(new Date().toISOString()));
  useEffect(() => {
    const t = setInterval(() => setNow(localMinutes(new Date().toISOString())), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  if (now < start || now > end) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (now - start) * PX }}>
      <span className="-ml-1 size-2.5 rounded-full bg-pole-500" />
      <span className="h-0.5 flex-1 bg-pole-500" />
    </div>
  );
}

/** Agenda del día en columnas por barbero */
export function DayGrid({ date, barbers, appointments, branchHours = [], onOpen, onCreate, showCancelled }) {
  const scroller = useRef(null);
  const weekday = weekdayOf(date);
  const bh = branchHours.find((h) => h.weekday === weekday);
  const isToday = date === todayISO();

  const { start, end } = useMemo(() => {
    const starts = [toMin(bh?.opens_at), ...barbers.map((b) => toMin(b.barber_schedules?.find((s) => s.weekday === weekday)?.start_time))];
    const ends = [toMin(bh?.closes_at), ...barbers.map((b) => toMin(b.barber_schedules?.find((s) => s.weekday === weekday)?.end_time))];
    appointments.forEach((a) => {
      starts.push(localMinutes(a.starts_at));
      ends.push(localMinutes(a.ends_at));
    });
    const s = Math.min(...starts.filter((x) => x != null), 9 * 60);
    const e = Math.max(...ends.filter((x) => x != null), 18 * 60);
    return { start: Math.floor(s / 60) * 60, end: Math.ceil(e / 60) * 60 };
  }, [bh, barbers, appointments, weekday]);

  // Lleva la vista a la hora actual (o al inicio) al cambiar de día
  useEffect(() => {
    if (!scroller.current) return;
    const target = isToday ? Math.min(Math.max(localMinutes(new Date().toISOString()) - start - 60, 0), end - start) * PX : 0;
    scroller.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [date, isToday, start, end]);

  if (bh?.is_closed) {
    return <EmptyState icon={CalendarOff} title="La sede no abre este día" className="rounded-lg bg-white py-20 ring-1 ring-line" />;
  }
  if (!barbers.length) {
    return <EmptyState title="No hay barberos activos en esta sede" className="rounded-lg bg-white py-20 ring-1 ring-line" />;
  }

  const hours = [];
  for (let m = start; m < end; m += 60) hours.push(m);
  const height = (end - start) * PX;

  const handleEmptyClick = (barber, e) => {
    if (!onCreate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = start + Math.floor((e.clientY - rect.top) / PX / 15) * 15;
    onCreate({ barberId: barber.id, time: fmtMin(minute) });
  };

  return (
    <div ref={scroller} className="max-h-[calc(100dvh-15rem)] min-h-[480px] overflow-auto rounded-lg bg-white shadow-card ring-1 ring-line">
      <div className="grid min-w-max" style={{ gridTemplateColumns: `4rem repeat(${barbers.length}, minmax(11.5rem, 1fr))` }}>
        {/* Encabezados */}
        <div className="sticky left-0 top-0 z-30 border-b border-r border-line bg-white" />
        {barbers.map((b) => {
          const sch = b.barber_schedules?.find((s) => s.weekday === weekday);
          return (
            <div
              key={b.id}
              className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-r border-line bg-white px-3 py-2.5 last:border-r-0"
            >
              <Avatar name={b.display_name} src={b.photo} size="sm" color={b.calendar_color} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{b.display_name}</p>
                <p className="text-xs text-ink-mute">{sch ? `${clock(sch.start_time)} a ${clock(sch.end_time)}` : 'Descansa hoy'}</p>
              </div>
            </div>
          );
        })}

        {/* Columna de horas */}
        <div className="sticky left-0 z-10 border-r border-line bg-white" style={{ height }}>
          {hours.map((m) => (
            <div key={m} className="relative" style={{ height: 60 * PX }}>
              <span className="tabular absolute -top-2 right-2 bg-white px-0.5 text-[0.7rem] text-ink-mute">
                {m === start ? '' : clock(fmtMin(m)).replace(':00', '')}
              </span>
            </div>
          ))}
        </div>

        {/* Columnas por barbero */}
        {barbers.map((b) => {
          const sch = b.barber_schedules?.find((s) => s.weekday === weekday);
          const blocks = [];
          if (!sch) blocks.push([start, end]);
          else {
            const s = toMin(sch.start_time);
            const e = toMin(sch.end_time);
            if (s > start) blocks.push([start, s]);
            if (e < end) blocks.push([e, end]);
            if (sch.break_start && sch.break_end) blocks.push([toMin(sch.break_start), toMin(sch.break_end)]);
          }
          const appts = appointments.filter((a) => a.barber_id === b.id && (showCancelled || a.status !== 'cancelled'));
          return (
            <div
              key={b.id}
              className="relative cursor-copy border-r border-line last:border-r-0"
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${60 * PX - 1}px, #ece7df ${60 * PX - 1}px, #ece7df ${60 * PX}px), repeating-linear-gradient(to bottom, transparent 0, transparent ${30 * PX - 1}px, #f4f0ea ${30 * PX - 1}px, #f4f0ea ${30 * PX}px)`,
              }}
              onClick={(e) => e.target === e.currentTarget && handleEmptyClick(b, e)}
              role="presentation"
            >
              {blocks.map(([s, e]) => (
                <div
                  key={`${s}-${e}`}
                  className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,rgba(43,20,22,0.045)_0,rgba(43,20,22,0.045)_6px,transparent_6px,transparent_12px)]"
                  style={{ top: (s - start) * PX, height: (e - s) * PX }}
                />
              ))}
              {appts.map((a) => {
                const s = localMinutes(a.starts_at);
                const e = localMinutes(a.ends_at);
                const h = Math.max((e - s) * PX - 3, 22);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpen(a)}
                    className={cn(
                      'absolute inset-x-1 z-10 overflow-hidden rounded-sm px-2 py-1 text-left ring-1 ring-inset transition-shadow hover:z-20 hover:shadow-pop',
                      STATUS_STYLE[a.status],
                    )}
                    style={{ top: (s - start) * PX + 1, height: h, borderLeft: `3px solid ${a.calendar_color}` }}
                    title={`${time(a.starts_at)} ${a.customer_name}, ${a.service_name}`}
                  >
                    <p className="truncate text-xs font-semibold">
                      <span className="tabular">{time(a.starts_at)}</span> {firstName(a.customer_name)}
                    </p>
                    {h > 36 && <p className="truncate text-xs text-ink-soft">{a.service_name}</p>}
                    {h > 56 && a.source === 'online' && <p className="mt-0.5 text-[0.68rem] text-sinu-600">Reservó en línea</p>}
                  </button>
                );
              })}
              {isToday && <NowLine start={start} end={end} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
