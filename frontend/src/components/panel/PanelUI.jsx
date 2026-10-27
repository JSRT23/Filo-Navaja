import { cn } from '@/lib/cn';
import { addDays, endOfMonth, shortDate, startOfMonth, startOfWeek, todayISO } from '@/lib/format';
import { Segmented } from '@/components/ui/Field';

export function PageHeader({ title, description, actions, children }) {
  return (
    <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="display text-5xl text-cordovan-900 sm:text-6xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName, padded = true }) {
  return (
    <section className={cn('rounded-lg bg-white shadow-card ring-1 ring-line', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && (typeof title === 'string' ? <h2 className="font-semibold text-ink">{title}</h2> : title)}
            {description && <p className="text-sm text-ink-mute">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Indicador numérico: valor grande + etiqueta + contexto opcional */
export function StatTile({ label, value, hint, icon: Icon, tone = 'default', loading }) {
  return (
    <div
      className={cn(
        'rounded-lg p-5 ring-1',
        tone === 'dark' ? 'bg-cordovan-900 text-bone-50 ring-cordovan-900' : 'bg-white shadow-card ring-line',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-sm', tone === 'dark' ? 'text-bone-100/70' : 'text-ink-soft')}>{label}</p>
        {Icon && <Icon className={cn('size-4', tone === 'dark' ? 'text-brass-300' : 'text-ink-mute')} aria-hidden />}
      </div>
      {loading ? (
        <div className={cn('mt-3 h-9 w-28 rounded-sm', tone === 'dark' ? 'skeleton-dark' : 'skeleton')} />
      ) : (
        <p className="tabular condensed mt-2 whitespace-nowrap text-[1.85rem] font-bold leading-none sm:text-[2.4rem]">{value}</p>
      )}
      {hint && <p className={cn('mt-2 text-sm', tone === 'dark' ? 'text-bone-100/60' : 'text-ink-mute')}>{hint}</p>}
    </div>
  );
}

export function rangeFor(preset, today = todayISO()) {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: startOfWeek(today), to: today };
    case 'fortnight': {
      const day = Number(today.slice(8));
      return { from: day <= 15 ? startOfMonth(today) : `${today.slice(0, 8)}16`, to: today };
    }
    case 'month':
      return { from: startOfMonth(today), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'prevMonth': {
      const prev = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    default:
      return { from: today, to: today };
  }
}

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'fortnight', label: 'Quincena' },
  { value: 'month', label: 'Mes' },
  { value: 'prevMonth', label: 'Mes anterior' },
];

export function RangePicker({ value, onChange, options = RANGE_OPTIONS }) {
  const r = rangeFor(value);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented aria-label="Periodo" value={value} onChange={onChange} options={options} size="sm" />
      <span className="text-sm text-ink-mute">{r.from === r.to ? shortDate(r.from) : `${shortDate(r.from)} al ${shortDate(r.to)}`}</span>
    </div>
  );
}

/** Lista con barra horizontal: un solo color de datos, valores en tinta */
export function BarList({ rows, valueFormat = (v) => v, emptyText = 'Sin datos en este periodo' }) {
  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 0);
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-mute">{emptyText}</p>;
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${valueFormat(r.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{r.label}</span>
            <span className="tabular shrink-0 font-semibold text-ink">{valueFormat(r.value)}</span>
          </div>
          {r.sub && <p className="text-xs text-ink-mute">{r.sub}</p>}
          <div className="mt-1.5 h-2 rounded-full bg-paper">
            <div
              className="h-2 rounded-full bg-chart transition-[width] duration-700"
              style={{ width: `${max ? Math.max((Number(r.value) / max) * 100, 2) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tabla simple con encabezado fijo y filas legibles */
export function Table({ children, className }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className, align = 'left' }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-line bg-paper/60 px-4 py-2.5 text-xs font-semibold text-ink-soft',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className, align = 'left' }) {
  return (
    <td className={cn('border-b border-line px-4 py-3 align-middle', align === 'right' && 'tabular text-right', className)}>{children}</td>
  );
}
