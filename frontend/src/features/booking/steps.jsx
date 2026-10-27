import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, MapPin, Shuffle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration, firstName, initials, longDate, money, time } from '@/lib/format';
import { BRANCH_PHOTO } from '@/lib/images';
import { groupByCategory } from '@/api/catalog';
import { useAvailableDates, useBranchAvailability } from '@/api/booking';
import { SmartImage } from '@/components/SmartImage';
import { OpenStatus, shortBranch } from '@/components/site/Branches';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/Feedback';
import { DateStrip, SlotGrid } from './SlotPicker';

function StepTitle({ children, hint }) {
  return (
    <div className="mb-6">
      <h2 className="display text-5xl text-cordovan-900 sm:text-6xl">{children}</h2>
      {hint && <p className="mt-2 text-ink-soft">{hint}</p>}
    </div>
  );
}

function SelectedTick({ show }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
        show ? 'border-sinu-500 bg-sinu-500 text-white' : 'border-line-strong bg-white text-transparent',
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export function StepBranch({ branches, value, onSelect }) {
  return (
    <div>
      <StepTitle hint="Las dos sedes tienen la misma carta de servicios.">¿En qué sede?</StepTitle>
      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Sede">
        {branches.map((b) => {
          const active = value === b.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(b.id)}
              className={cn(
                'group overflow-hidden rounded-lg bg-white text-left ring-1 transition-shadow',
                active ? 'ring-2 ring-cordovan-900' : 'ring-line hover:ring-line-strong',
              )}
            >
              <SmartImage photo={BRANCH_PHOTO[b.slug] ?? 'shop'} className="aspect-[16/8]" sizes="(min-width: 640px) 30vw, 100vw" />
              <div className="flex items-start justify-between gap-3 p-5">
                <div>
                  <p className="display text-4xl text-cordovan-900">{shortBranch(b.name)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                    <MapPin className="size-3.5" aria-hidden /> {b.address}
                  </p>
                  <OpenStatus hours={b.branch_hours} className="mt-3" />
                </div>
                <SelectedTick show={active} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepService({ services, value, onSelect }) {
  const groups = groupByCategory(services);
  return (
    <div>
      <StepTitle hint="El precio queda fijo desde que reservas.">¿Qué te vas a hacer?</StepTitle>
      <div className="space-y-8">
        {groups.map(({ category, items }) => (
          <section key={category.id ?? category.name}>
            <h3 className="mb-2 text-sm font-semibold text-ink-soft">{category.name}</h3>
            <div
              className="divide-y divide-line overflow-hidden rounded-lg bg-white ring-1 ring-line"
              role="radiogroup"
              aria-label={category.name}
            >
              {items.map((s) => {
                const active = value === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors',
                      active ? 'bg-sinu-50' : 'hover:bg-paper',
                    )}
                  >
                    <SelectedTick show={active} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 font-semibold text-ink">
                        {s.name}
                        {s.is_featured && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brass-700">
                            <Sparkles className="size-3" aria-hidden /> De los más pedidos
                          </span>
                        )}
                      </span>
                      {s.description && <span className="mt-0.5 block text-sm text-ink-soft">{s.description}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block font-semibold">{money(s.price)}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-ink-mute">
                        <Clock className="size-3" aria-hidden /> {duration(s.duration_minutes)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function StepBarber({ barbers, value, onSelect }) {
  const options = [{ id: 'any', display_name: 'El primero disponible', any: true }, ...barbers];
  return (
    <div>
      <StepTitle hint="Si te da igual, te mostramos todas las horas libres de la sede.">¿Con quién?</StepTitle>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Barbero">
        {options.map((b) => {
          const active = value === b.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(b.id)}
              className={cn(
                'flex items-center gap-4 rounded-lg bg-white p-4 text-left ring-1 transition-shadow',
                active ? 'ring-2 ring-cordovan-900' : 'ring-line hover:ring-line-strong',
              )}
            >
              {b.any ? (
                <span className="grid size-14 shrink-0 place-items-center rounded-md bg-sinu-500 text-white">
                  <Shuffle className="size-6" aria-hidden />
                </span>
              ) : (
                <Avatar name={b.display_name} src={b.photo} size="lg" square />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{b.display_name}</span>
                <span className="mt-0.5 block truncate text-sm text-ink-soft">
                  {b.any ? 'Más horarios para escoger' : b.specialties?.join(', ')}
                </span>
              </span>
              <SelectedTick show={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepTime({ branchId, serviceId, barberId, date, slot, onDate, onSlot, onContinue }) {
  const specific = barberId && barberId !== 'any' ? barberId : null;
  const dates = useAvailableDates({ serviceId, branchId, barberId: specific });
  const availability = useBranchAvailability({ branchId, serviceId, date });

  // Elige automáticamente el primer día con cupo
  useEffect(() => {
    const first = dates.data?.[0]?.available_on;
    const stillValid = dates.data?.some((d) => d.available_on === date);
    if (first && (!date || !stillValid)) onDate(first);
  }, [dates.data, date, onDate]);

  const { slots, barbersAt } = useMemo(() => {
    const rows = (availability.data ?? []).filter((r) => !specific || r.barber_id === specific);
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.slot_start)) map.set(r.slot_start, []);
      map.get(r.slot_start).push(r);
    }
    return { slots: [...map.values()].map((list) => list[0]), barbersAt: map };
  }, [availability.data, specific]);

  const alternatives = slot && !specific ? (barbersAt.get(slot.start) ?? []) : [];
  const [showAll, setShowAll] = useState(false);

  return (
    <div>
      <StepTitle hint="Solo ves horas que de verdad están libres.">¿Cuándo?</StepTitle>
      {dates.error ? (
        <ErrorState error={dates.error} onRetry={dates.refetch} />
      ) : !dates.isPending && !dates.data?.length ? (
        <p className="rounded-md bg-paper px-4 py-6 text-center text-ink-soft">
          No hay cupos en las próximas tres semanas para esta combinación. Prueba con otro barbero o con la otra sede.
        </p>
      ) : (
        <>
          <DateStrip available={dates.data} loading={dates.isPending} value={date} onChange={onDate} />
          {date && <p className="mb-4 mt-5 font-semibold text-ink first-letter:uppercase">{longDate(date)}</p>}
          {availability.error ? (
            <ErrorState error={availability.error} onRetry={availability.refetch} />
          ) : (
            <SlotGrid
              slots={slots}
              loading={availability.isPending && Boolean(date)}
              value={slot?.start}
              onChange={(s) =>
                onSlot({ start: s.slot_start, end: s.slot_end, barberId: s.barber_id, barberName: s.barber_name, barberPhoto: s.photo_url })
              }
            />
          )}
        </>
      )}

      {slot && (
        <div className="mt-8 flex flex-col gap-4 rounded-lg bg-white p-5 ring-1 ring-line sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={slot.barberName} src={slot.barberPhoto} />
            <div>
              <p className="font-semibold">
                {time(slot.start)} con {firstName(slot.barberName)}
              </p>
              {alternatives.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-sm font-medium text-cordovan-700 hover:underline"
                >
                  {showAll ? 'Ocultar' : `Prefiero otro barbero a esa hora (${alternatives.length - 1} más)`}
                </button>
              )}
            </div>
          </div>
          <Button variant="dark" onClick={onContinue}>
            Continuar
          </Button>
          {showAll && alternatives.length > 1 && (
            <div className="flex flex-wrap gap-2 sm:basis-full">
              {alternatives.map((a) => (
                <button
                  key={a.barber_id}
                  type="button"
                  onClick={() => onSlot({ ...slot, barberId: a.barber_id, barberName: a.barber_name, barberPhoto: a.photo_url })}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition-colors',
                    a.barber_id === slot.barberId
                      ? 'bg-cordovan-900 text-bone-50 ring-cordovan-900'
                      : 'bg-white ring-line hover:ring-line-strong',
                  )}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-cordovan-800 text-[0.65rem] font-bold text-brass-300">
                    {initials(a.barber_name)}
                  </span>
                  {a.barber_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
