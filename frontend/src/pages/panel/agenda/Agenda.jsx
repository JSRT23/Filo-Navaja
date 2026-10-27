import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { useAgenda, useRealtime, useStaffBarbers } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { addDays, firstName, longDate, money, time, todayISO } from '@/lib/format';
import { STATUS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/panel/PanelUI';
import { Button, IconButton } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { ErrorState, EmptyState, PageLoader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/Badge';
import { DayGrid } from './DayGrid';
import { AppointmentModal } from './AppointmentModal';
import { NewAppointmentModal } from './NewAppointmentModal';

function DateNav({ date, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md bg-white shadow-card ring-1 ring-line">
        <IconButton label="Día anterior" onClick={() => onChange(addDays(date, -1))}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <label className="relative flex h-9 cursor-pointer items-center gap-2 border-x border-line px-3 text-sm font-semibold first-letter:uppercase">
          <CalendarDays className="size-4 text-ink-mute" aria-hidden />
          <span className="first-letter:uppercase">{longDate(date)}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Elegir fecha"
          />
        </label>
        <IconButton label="Día siguiente" onClick={() => onChange(addDays(date, 1))}>
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
      {date !== todayISO() && (
        <Button variant="outline" size="sm" onClick={() => onChange(todayISO())}>
          Hoy
        </Button>
      )}
    </div>
  );
}

function Counters({ appointments }) {
  const count = (s) => appointments.filter((a) => a.status === s).length;
  const active = appointments.filter((a) => a.status !== 'cancelled');
  const expected = active.filter((a) => a.status !== 'no_show').reduce((sum, a) => sum + Number(a.price), 0);
  const items = [
    ['Citas', active.length],
    [STATUS.confirmed.label + 's', count('confirmed') + count('pending')],
    [STATUS.in_progress.label, count('in_progress')],
    [STATUS.completed.label + 's', count('completed')],
    [STATUS.no_show.label, count('no_show')],
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {items.map(([label, n]) => (
        <span key={label} className="text-ink-soft">
          {label} <span className="tabular font-semibold text-ink">{n}</span>
        </span>
      ))}
      <span className="text-ink-soft">
        Ingreso esperado <span className="tabular font-semibold text-ink">{money(expected)}</span>
      </span>
    </div>
  );
}

/** Vista del barbero: su día en una lista */
function BarberDay({ appointments, onOpen }) {
  const list = appointments.filter((a) => a.status !== 'cancelled');
  if (!list.length)
    return <EmptyState icon={Clock} title="No tienes citas este día" className="rounded-lg bg-white py-16 ring-1 ring-line" />;
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[4.6rem] before:top-4 before:w-px before:bg-line">
      {list.map((a) => (
        <li key={a.id} className="relative flex gap-4">
          <span className="tabular w-16 shrink-0 pt-4 text-right text-sm font-semibold">{time(a.starts_at)}</span>
          <span
            className="relative z-10 mt-[1.15rem] size-3 shrink-0 rounded-full ring-4 ring-paper"
            style={{ background: a.calendar_color }}
          />
          <button
            type="button"
            onClick={() => onOpen(a)}
            className={cn(
              'flex flex-1 items-center justify-between gap-4 rounded-lg bg-white p-4 text-left shadow-card ring-1 ring-line hover:ring-line-strong',
              a.status === 'completed' && 'opacity-70',
            )}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{a.customer_name}</p>
              <p className="truncate text-sm text-ink-soft">
                {a.service_name}, hasta las {time(a.ends_at)}
              </p>
              {a.customer_notes && <p className="mt-1 truncate text-sm text-amber-600">«{a.customer_notes}»</p>}
            </div>
            <StatusBadge status={a.status} />
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function Agenda() {
  const { role, barber, isFrontDesk } = useAuth();
  const { branchId, branch } = usePanel();
  usePageTitle(role === 'barber' ? 'Mi agenda' : 'Agenda');
  const [date, setDate] = useState(todayISO());
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const barberId = role === 'barber' ? barber?.id : null;
  const agenda = useAgenda({ branchId, date, barberId });
  const barbers = useStaffBarbers(branchId);
  useRealtime('appointments', `branch_id=eq.${branchId}`, [['agenda'], ['pending-checkout']], Boolean(branchId));

  const appointments = useMemo(() => agenda.data ?? [], [agenda.data]);
  const current = selected ? (appointments.find((a) => a.id === selected.id) ?? selected) : null;

  return (
    <>
      <PageHeader
        title={role === 'barber' ? `Hola, ${firstName(barber?.display_name)}` : 'Agenda'}
        description={
          role === 'barber'
            ? 'Tus citas del día. Toca una para marcar llegada o terminar.'
            : `Sede ${branch?.name.replace('Filo & Navaja ', '')}. Toca un espacio libre para agendar.`
        }
        actions={
          isFrontDesk && (
            <Button variant="dark" onClick={() => setCreating({ date })}>
              <Plus className="size-4" aria-hidden /> Nueva cita
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DateNav date={date} onChange={setDate} />
        {isFrontDesk && <Switch label="Ver canceladas" checked={showCancelled} onChange={setShowCancelled} className="items-center" />}
      </div>

      {agenda.error ? (
        <ErrorState error={agenda.error} onRetry={agenda.refetch} />
      ) : agenda.isPending || barbers.isPending ? (
        <PageLoader />
      ) : (
        <>
          <Counters appointments={appointments} />
          {role === 'barber' ? (
            <BarberDay appointments={appointments} onOpen={setSelected} />
          ) : (
            <DayGrid
              date={date}
              barbers={barbers.data ?? []}
              appointments={appointments}
              branchHours={branch?.branch_hours}
              onOpen={setSelected}
              onCreate={({ barberId: b, time: t }) => setCreating({ date, barberId: b, time: t })}
              showCancelled={showCancelled}
            />
          )}
        </>
      )}

      <AppointmentModal appointment={current} open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)} />
      {isFrontDesk && (
        <NewAppointmentModal
          open={Boolean(creating)}
          onOpenChange={(o) => !o && setCreating(null)}
          barbers={barbers.data ?? []}
          defaults={creating}
        />
      )}
    </>
  );
}
