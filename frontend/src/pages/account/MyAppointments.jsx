import { useMemo, useState } from 'react';
import { CalendarPlus, CalendarX, Clock, MapPin, Scissors } from 'lucide-react';
import { useBranches, useSettings } from '@/api/catalog';
import { useMyAppointments } from '@/api/booking';
import { useAuth } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { monthShort, firstName, money, shortDate, time, weekdayShort, whatsappLink } from '@/lib/format';
import { googleCalendarUrl } from '@/features/booking/calendar';
import { RescheduleModal } from '@/features/booking/RescheduleModal';
import { CancelModal } from '@/features/booking/CancelModal';
import { AccountNav } from './AccountNav';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { WhatsAppGlyph } from '@/components/brand/Glyphs';
import { shortBranch } from '@/components/site/Branches';

function UpcomingCard({ a, branch, windowMinutes, onReschedule, onCancel }) {
  const minutesLeft = (new Date(a.starts_at) - Date.now()) / 60000;
  const canChange = minutesLeft > windowMinutes;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-ticket ring-1 ring-line sm:flex-row">
      <div className="flex shrink-0 items-center gap-4 bg-onyx-900 px-6 py-5 text-bone-50 sm:w-40 sm:flex-col sm:justify-center sm:gap-0 sm:text-center">
        <span className="text-sm capitalize text-bone-100/70">{weekdayShort(a.starts_at)}</span>
        <span className="display text-6xl sm:mt-1">{Number(a.local_date.slice(8))}</span>
        <span className="text-sm capitalize text-bone-100/70">{monthShort(a.starts_at)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="semi-condensed text-2xl font-bold text-ink">{a.service_name}</p>
            <StatusBadge status={a.status} />
          </div>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <Clock className="size-4 text-ink-mute" aria-hidden /> {time(a.starts_at)} con {a.barber_name}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-ink-mute" aria-hidden /> {shortBranch(a.branch_name)}
              {branch?.address ? `, ${branch.address}` : ''}
            </li>
          </ul>
          {!canChange && (
            <p className="mt-3 text-sm text-amber-600">
              Faltan menos de {Math.round(windowMinutes / 60)} horas. Para cambios escribe a la sede.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {canChange ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onReschedule(a)}>
                Reprogramar
              </Button>
              <Button variant="danger-ghost" size="sm" onClick={() => onCancel(a)}>
                Cancelar
              </Button>
            </>
          ) : (
            branch?.whatsapp && (
              <Button
                href={whatsappLink(branch.whatsapp, `Hola, tengo cita hoy a las ${time(a.starts_at)} con ${firstName(a.barber_name)}`)}
                target="_blank"
                rel="noreferrer"
                variant="sinu"
                size="sm"
              >
                <WhatsAppGlyph className="size-4" /> Escribir a la sede
              </Button>
            )
          )}
          <Button
            href={googleCalendarUrl({
              title: `${a.service_name} en Filo & Navaja`,
              start: a.starts_at,
              end: a.ends_at,
              details: `Con ${a.barber_name}`,
              location: branch ? `${branch.address}, ${branch.city}` : a.branch_name,
            })}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="sm"
          >
            <CalendarPlus className="size-4" aria-hidden /> Calendario
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function MyAppointments() {
  usePageTitle('Mis citas');
  const { customer, profile } = useAuth();
  const { data = [], isPending, error, refetch } = useMyAppointments(customer?.id);
  const { data: branches = [] } = useBranches();
  const { data: settings } = useSettings();
  const [rescheduling, setRescheduling] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const windowMinutes = Number(settings?.cancellation_window_minutes ?? 120);
  const branchById = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);

  const now = Date.now();
  const upcoming = data.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status) && new Date(a.ends_at) > now).reverse();
  const history = data.filter((a) => !upcoming.includes(a));

  return (
    <div className="bg-bone-50">
      <div className="bg-onyx-900 pb-10 pt-28 text-bone-50 sm:pt-32">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="text-bone-100/70">Hola, {firstName(profile?.full_name)}</p>
            <h1 className="display mt-1 text-[clamp(3.25rem,8vw,5.5rem)]">Mis citas</h1>
          </div>
          <Button to="/reservar">Reservar otro turno</Button>
        </div>
        <div className="mx-auto mt-8 max-w-5xl px-5 sm:px-8">
          <AccountNav />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <>
            <section aria-labelledby="proximas">
              <h2 id="proximas" className="semi-condensed text-2xl font-bold text-onyx-900">
                Próximas
              </h2>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={Scissors}
                  title="No tienes citas próximas"
                  action={
                    <Button to="/reservar" variant="dark">
                      Reservar turno
                    </Button>
                  }
                  className="mt-4 rounded-xl bg-white ring-1 ring-line"
                >
                  Elige sede, servicio y hora en menos de un minuto.
                </EmptyState>
              ) : (
                <div className="mt-4 space-y-4">
                  {upcoming.map((a) => (
                    <UpcomingCard
                      key={a.id}
                      a={a}
                      branch={branchById[a.branch_id]}
                      windowMinutes={windowMinutes}
                      onReschedule={setRescheduling}
                      onCancel={setCancelling}
                    />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="historial" className="mt-14">
              <h2 id="historial" className="semi-condensed text-2xl font-bold text-onyx-900">
                Historial
              </h2>
              {history.length === 0 ? (
                <EmptyState icon={CalendarX} title="Aún no tienes historial" className="mt-4" />
              ) : (
                <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl bg-white ring-1 ring-line">
                  {history.map((a) => (
                    <li
                      key={a.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[8rem_1fr_auto_6rem]"
                    >
                      <span className="tabular text-sm text-ink-soft">{shortDate(a.starts_at)}</span>
                      <span className="order-first col-span-2 font-medium sm:order-none sm:col-span-1">
                        {a.service_name}
                        <span className="block text-sm font-normal text-ink-soft">
                          {a.barber_name}, {shortBranch(a.branch_name)}
                        </span>
                      </span>
                      <StatusBadge status={a.status} className="justify-self-end" />
                      <span
                        className={cn(
                          'tabular hidden text-right text-sm sm:block',
                          a.status === 'completed' ? 'text-ink' : 'text-ink-mute line-through',
                        )}
                      >
                        {money(a.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <RescheduleModal
        appointment={rescheduling}
        open={Boolean(rescheduling)}
        onOpenChange={(o) => !o && setRescheduling(null)}
        onDone={refetch}
      />
      <CancelModal appointment={cancelling} open={Boolean(cancelling)} onOpenChange={(o) => !o && setCancelling(null)} onDone={refetch} />
    </div>
  );
}
