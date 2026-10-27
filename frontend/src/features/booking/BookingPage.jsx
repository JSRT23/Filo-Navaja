import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useBarbers, useBranches, useServices, useSettings } from '@/api/catalog';
import { useBookAppointment } from '@/api/booking';
import { errorMessage } from '@/lib/errors';
import { duration, longDate, money, time, toISODate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { shortBranch } from '@/components/site/Branches';
import { StepBarber, StepBranch, StepService, StepTime } from './steps';
import { BookingSuccess, StepConfirm } from './Confirm';

const STEPS = ['Sede', 'Servicio', 'Barbero', 'Horario', 'Confirmar'];
const DRAFT_KEY = 'filo-navaja-booking-draft';
const EMPTY = { branchId: null, serviceId: null, barberId: null, date: null, slot: null, notes: '' };

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}
function writeDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* almacenamiento no disponible: la reserva sigue funcionando */
  }
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nada que limpiar */
  }
}

const firstIncomplete = (d) => (!d.branchId ? 0 : !d.serviceId ? 1 : !d.barberId ? 2 : !d.slot ? 3 : 4);

function Stepper({ step, maxStep, onGo }) {
  return (
    <ol className="flex gap-1.5 overflow-x-auto scrollbar-none" aria-label="Pasos de la reserva">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const reachable = i <= maxStep;
        return (
          <li key={label} className={cn('min-w-0', i === step ? 'flex-[2.6] sm:flex-1' : 'flex-1')}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(i)}
              aria-current={current ? 'step' : undefined}
              className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  'h-1 w-full rounded-full transition-colors duration-500',
                  done || current ? 'bg-brass-400' : 'bg-bone-100/15',
                )}
              />
              <span
                className={cn(
                  'whitespace-nowrap text-sm transition-colors',
                  current
                    ? 'font-semibold text-bone-50'
                    : done
                      ? 'hidden text-bone-100/80 group-hover:text-bone-50 sm:block'
                      : 'hidden text-bone-100/40 sm:block',
                )}
              >
                <span className="tabular mr-1">{i + 1}.</span>
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Summary({ branch, service, barber, draft, onGo }) {
  const rows = [
    { step: 0, label: 'Sede', value: branch ? shortBranch(branch.name) : null },
    { step: 1, label: 'Servicio', value: service?.name, extra: service ? duration(service.duration_minutes) : null },
    {
      step: 2,
      label: 'Barbero',
      value: draft.slot?.barberName ?? (draft.barberId === 'any' ? 'El primero disponible' : barber?.display_name),
    },
    { step: 3, label: 'Horario', value: draft.slot ? `${longDate(draft.slot.start)}, ${time(draft.slot.start)}` : null },
  ];
  return (
    <aside className="rounded-xl bg-white shadow-ticket ring-1 ring-line lg:sticky lg:top-24">
      <div className="px-6 pb-3 pt-5">
        <p className="semi-condensed text-xl font-bold text-cordovan-900">Tu turno</p>
      </div>
      <dl className="px-6">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 border-t border-dashed border-line py-3">
            <dt className="text-sm text-ink-mute">{r.label}</dt>
            <dd className="text-right text-sm">
              {r.value ? (
                <button
                  type="button"
                  onClick={() => onGo(r.step)}
                  className="font-semibold text-ink first-letter:uppercase hover:text-cordovan-700"
                >
                  {r.value}
                  {r.extra && <span className="block text-xs font-normal text-ink-mute">{r.extra}</span>}
                </button>
              ) : (
                <span className="text-ink-mute">Por elegir</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="relative mt-2 flex items-baseline justify-between rounded-b-xl bg-cordovan-900 px-6 py-4 text-bone-50">
        <span
          aria-hidden
          className="absolute -top-2 left-0 right-0 h-4 bg-[radial-gradient(circle_at_8px_0,transparent_6px,#2b1416_6.5px)] bg-[length:16px_16px] bg-repeat-x"
        />
        <span className="text-sm text-bone-100/70">Total a pagar en la sede</span>
        <span className="tabular text-2xl font-bold">{service ? money(service.price) : '—'}</span>
      </div>
    </aside>
  );
}

export default function BookingPage() {
  usePageTitle('Reservar turno');
  const [params, setParams] = useSearchParams();
  const branchesQ = useBranches();
  const servicesQ = useServices();
  const barbersQ = useBarbers();
  const { data: settings } = useSettings();
  const book = useBookAppointment();

  const [draft, setDraft] = useState(readDraft);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState(null);
  const initialized = useRef(false);
  const topRef = useRef(null);

  const branches = useMemo(() => branchesQ.data ?? [], [branchesQ.data]);
  const services = useMemo(() => servicesQ.data ?? [], [servicesQ.data]);
  const barbers = useMemo(() => barbersQ.data ?? [], [barbersQ.data]);
  const ready = branchesQ.isSuccess && servicesQ.isSuccess && barbersQ.isSuccess;

  // Prefill desde la URL (enlaces de la carta, del perfil del barbero o del próximo turno libre)
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    const sede = params.get('sede');
    const servicio = params.get('servicio');
    const barbero = params.get('barbero');
    const fecha = params.get('fecha');
    const hora = params.get('hora');
    let next = draft;
    if (sede || servicio || barbero) {
      const barber = barbers.find((b) => b.id === barbero);
      const branch = branches.find((b) => b.slug === sede) ?? (barber ? branches.find((b) => b.id === barber.branch_id) : null);
      const service = services.find((s) => s.slug === servicio);
      next = { ...EMPTY, branchId: branch?.id ?? null, serviceId: service?.id ?? null, barberId: barber?.id ?? null };
      if (barber && service && !barber.serviceIds.includes(service.id)) next.barberId = null;
      if (next.barberId && fecha && hora) {
        next.date = fecha;
        next.slot = { start: hora, end: null, barberId: barber.id, barberName: barber.display_name, barberPhoto: barber.photo };
      }
      setParams({}, { replace: true });
    }
    if (!next.branchId && branches.length === 1) next = { ...next, branchId: branches[0].id };
    if (next.slot && new Date(next.slot.start) < new Date()) next = { ...next, slot: null, date: null };
    setDraft(next);
    setStep(next.slot ? 3 : firstIncomplete(next));
  }, [ready, params, setParams, branches, services, barbers, draft]);

  useEffect(() => {
    if (initialized.current && !done) writeDraft(draft);
  }, [draft, done]);

  const branch = branches.find((b) => b.id === draft.branchId);
  const service = services.find((s) => s.id === draft.serviceId);
  const barber = barbers.find((b) => b.id === draft.barberId);

  const branchBarbers = useMemo(
    () => barbers.filter((b) => b.branch_id === draft.branchId && b.accepts_online_booking),
    [barbers, draft.branchId],
  );
  const branchServices = useMemo(
    () => services.filter((s) => branchBarbers.some((b) => b.serviceIds.includes(s.id))),
    [services, branchBarbers],
  );
  const serviceBarbers = useMemo(
    () => branchBarbers.filter((b) => b.serviceIds.includes(draft.serviceId)),
    [branchBarbers, draft.serviceId],
  );

  const go = useCallback(
    (i) => {
      setDirection(i > step ? 1 : -1);
      setStep(i);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [step],
  );

  const update = (patch, nextStep) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (nextStep !== undefined) go(nextStep);
  };

  const selectBranch = (id) => {
    const keepService = services.find((s) => s.id === draft.serviceId);
    update({ branchId: id, barberId: null, date: null, slot: null, serviceId: keepService ? draft.serviceId : null }, keepService ? 2 : 1);
  };
  const selectService = (id) => update({ serviceId: id, barberId: null, date: null, slot: null }, 2);
  const selectBarber = (id) => update({ barberId: id, slot: null }, 3);
  const selectDate = useCallback((date) => setDraft((d) => (d.date === date ? d : { ...d, date, slot: null })), []);

  const confirm = async () => {
    try {
      const slot = draft.slot;
      const end = slot.end ?? new Date(new Date(slot.start).getTime() + service.duration_minutes * 60000).toISOString();
      await book.mutateAsync({ barberId: slot.barberId, serviceId: service.id, startsAt: slot.start, notes: draft.notes });
      setDone({ branch, service, slot: { ...slot, end } });
      clearDraft();
      toast.success('Turno reservado', { description: `${longDate(slot.start)}, ${time(slot.start)}` });
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      const msg = errorMessage(e);
      toast.error('No se pudo reservar', { description: msg });
      if (/horario|disponible|reservado/i.test(msg)) {
        setDraft((d) => ({ ...d, slot: null }));
        go(3);
      }
    }
  };

  const anotherBooking = () => {
    setDone(null);
    setDraft({ ...EMPTY, branchId: draft.branchId });
    setStep(1);
  };

  const maxStep = firstIncomplete(draft);
  const error = branchesQ.error || servicesQ.error || barbersQ.error;

  return (
    <div className="min-h-screen bg-bone-50">
      <div ref={topRef} className="scroll-mt-0 bg-cordovan-900 pb-8 pt-28 text-bone-50 sm:pt-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h1 className="display text-[clamp(3.25rem,8vw,5.5rem)]">Reserva tu turno</h1>
          {!done && (
            <div className="mt-8">
              <Stepper step={step} maxStep={maxStep} onGo={go} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {error ? (
          <ErrorState error={error} onRetry={() => [branchesQ, servicesQ, barbersQ].forEach((q) => q.refetch())} />
        ) : !ready ? (
          <PageLoader />
        ) : done ? (
          <BookingSuccess booking={done} onAnother={anotherBooking} />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
            <div className="min-w-0">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => go(step - 1)}
                  className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  <ArrowLeft className="size-4" aria-hidden /> Atrás
                </button>
              )}
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -28 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 && <StepBranch branches={branches} value={draft.branchId} onSelect={selectBranch} />}
                  {step === 1 && <StepService services={branchServices} value={draft.serviceId} onSelect={selectService} />}
                  {step === 2 && <StepBarber barbers={serviceBarbers} value={draft.barberId} onSelect={selectBarber} />}
                  {step === 3 && (
                    <StepTime
                      branchId={draft.branchId}
                      serviceId={draft.serviceId}
                      barberId={draft.barberId}
                      date={draft.date ?? (draft.slot ? toISODate(draft.slot.start) : null)}
                      slot={draft.slot}
                      onDate={selectDate}
                      onSlot={(slot) => update({ slot })}
                      onContinue={() => go(4)}
                    />
                  )}
                  {step === 4 && branch && service && draft.slot && (
                    <StepConfirm
                      branch={branch}
                      service={service}
                      slot={draft.slot}
                      notes={draft.notes}
                      onNotes={(notes) => setDraft((d) => ({ ...d, notes }))}
                      onConfirm={confirm}
                      submitting={book.isPending}
                      settings={settings}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div>
              <Summary branch={branch} service={service} barber={barber} draft={draft} onGo={(i) => i <= maxStep && go(i)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
