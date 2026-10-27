import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { addDays, monthShort, time, todayISO, weekdayShort } from '@/lib/format';
import { groupSlotsByPeriod } from '@/api/booking';
import { Skeleton } from '@/components/ui/Feedback';

/** Tira de fechas desplazable; los días sin cupo aparecen deshabilitados */
export function DateStrip({ available = [], loading, value, onChange, days = 21 }) {
  const scroller = useRef(null);
  const counts = useMemo(() => Object.fromEntries(available.map((d) => [d.available_on, d.slots_count])), [available]);
  const list = useMemo(() => Array.from({ length: days }, (_, i) => addDays(todayISO(), i)), [days]);

  useEffect(() => {
    if (!value || !scroller.current) return;
    const el = scroller.current.querySelector(`[data-date="${value}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [value]);

  const scrollBy = (dir) => scroller.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="-mx-1 flex snap-x scroll-px-1 gap-2 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none sm:mx-9 sm:scroll-px-0 sm:px-0"
        role="listbox"
        aria-label="Fecha"
      >
        {list.map((d) => {
          const count = counts[d] ?? 0;
          const disabled = !loading && count === 0;
          const active = value === d;
          return (
            <button
              key={d}
              type="button"
              role="option"
              aria-selected={active}
              data-date={d}
              disabled={disabled || loading}
              onClick={() => onChange(d)}
              className={cn(
                'flex w-[4.4rem] shrink-0 snap-start flex-col items-center rounded-md border px-2 py-2.5 transition-colors',
                active
                  ? 'border-onyx-900 bg-onyx-900 text-bone-50'
                  : disabled
                    ? 'cursor-not-allowed border-transparent bg-paper text-ink-mute/60'
                    : 'border-line bg-white text-ink hover:border-onyx-600',
                loading && 'animate-pulse',
              )}
            >
              <span className="text-xs capitalize">{d === todayISO() ? 'Hoy' : weekdayShort(d)}</span>
              <span className="condensed text-2xl font-bold leading-tight">{Number(d.slice(8))}</span>
              <span className={cn('text-[0.7rem]', active ? 'text-bone-100/70' : 'text-ink-mute')}>{monthShort(d)}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Fechas anteriores"
          className="pointer-events-auto grid size-8 place-items-center rounded-full bg-white shadow-card ring-1 ring-line hover:bg-paper"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Fechas siguientes"
          className="pointer-events-auto grid size-8 place-items-center rounded-full bg-white shadow-card ring-1 ring-line hover:bg-paper"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Horarios agrupados por mañana, tarde y noche */
export function SlotGrid({ slots = [], loading, value, onChange, emptyText = 'No quedan horarios este día. Prueba otra fecha.' }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-md" />
        ))}
      </div>
    );
  }
  if (!slots.length) return <p className="rounded-md bg-paper px-4 py-6 text-center text-sm text-ink-soft">{emptyText}</p>;

  return (
    <div className="space-y-5">
      {groupSlotsByPeriod(slots).map(([period, list]) => (
        <div key={period}>
          <p className="mb-2 text-sm font-medium text-ink-soft">{period}</p>
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
            role="listbox"
            aria-label={`Horarios de la ${period.toLowerCase()}`}
          >
            {list.map((s) => {
              const active = value === s.slot_start;
              return (
                <motion.button
                  key={s.slot_start}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onChange(s)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    'tabular h-11 rounded-md border text-sm font-semibold transition-colors',
                    active
                      ? 'border-sinu-500 bg-sinu-500 text-white'
                      : 'border-line bg-white text-ink hover:border-sinu-500 hover:text-sinu-600',
                  )}
                >
                  {time(s.slot_start)}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
