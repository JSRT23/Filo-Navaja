import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Delete, Expand, LogIn, LogOut } from 'lucide-react';
import { useBranches } from '@/api/catalog';
import { useKioskBoard, useRegisterAttendance } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { clock, firstName, initials, longDate, time, todayISO } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { nowInBogota } from '@/lib/hours';
import { publicUrl } from '@/lib/supabase';
import { sized } from '@/lib/images';
import { Img } from '@/components/ui/Img';
import { Logo } from '@/components/brand/Logo';
import { PageLoader, ErrorState } from '@/components/ui/Feedback';
import { shortBranch } from '@/components/site/Branches';

const BRANCH_KEY = 'filo-navaja-panel-branch';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return now;
}

const statusText = (b) => {
  if (b.status === 'in') return { label: `En turno desde las ${time(b.last_event_at)}`, tone: 'in' };
  if (b.status === 'out') return { label: `Salió a las ${time(b.last_event_at)}`, tone: 'out' };
  if (!b.scheduled_start) return { label: 'Descansa hoy', tone: 'off' };
  if (b.scheduled_end && nowInBogota().time > b.scheduled_end.slice(0, 5)) return { label: 'No marcó entrada hoy', tone: 'off' };
  return { label: `Entra a las ${clock(b.scheduled_start)}`, tone: 'pending' };
};

function PinPad({ barber, onClose, onDone }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(0);
  const register = useRegisterAttendance();

  const submit = useCallback(
    async (value) => {
      if (value.length < 4 || register.isPending) return;
      try {
        const res = await register.mutateAsync({ barberId: barber.barber_id, pin: value });
        if (res?.ok) onDone(res);
        else {
          setError(
            res?.attempts_left != null ? `${res.error}. Te quedan ${res.attempts_left} intentos.` : (res?.error ?? 'No se pudo registrar'),
          );
          setPin('');
          setShake((s) => s + 1);
        }
      } catch (e) {
        setError(errorMessage(e));
        setPin('');
        setShake((s) => s + 1);
      }
    },
    [barber, register, onDone],
  );

  const press = useCallback(
    (k) => {
      setError(null);
      if (k === 'del') return setPin((p) => p.slice(0, -1));
      if (k === 'ok') return submit(pin);
      const next = (pin + k).slice(0, 6);
      setPin(next);
      if (next.length === 6) submit(next);
    },
    [pin, submit],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('ok');
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-onyx-950/85 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`PIN de ${barber.display_name}`}
        className="w-full max-w-sm rounded-xl bg-onyx-900 p-7 text-center text-bone-50 shadow-pop ring-1 ring-bone-100/10"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <p className="text-bone-100/65">Hola,</p>
        <p className="display text-5xl">{firstName(barber.display_name)}</p>
        <p className="mt-2 text-sm text-bone-100/65">Digita tu PIN para registrar {barber.status === 'in' ? 'la salida' : 'la entrada'}</p>

        <motion.div
          key={shake}
          className="my-6 flex justify-center gap-3"
          animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-4 rounded-full ring-2 transition-colors',
                i < pin.length ? 'bg-gold-400 ring-gold-400' : 'ring-bone-100/30',
              )}
            />
          ))}
        </motion.div>
        <p className="min-h-5 text-sm text-pole-100" role="alert">
          {error}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={register.isPending}
              aria-label={k === 'del' ? 'Borrar' : k === 'ok' ? 'Registrar' : k}
              className={cn(
                'condensed grid h-16 place-items-center rounded-md text-3xl font-bold transition-colors active:scale-95 disabled:opacity-50',
                k === 'ok' ? 'bg-gold-500 text-onyx-950 hover:bg-gold-400' : 'bg-onyx-800 hover:bg-onyx-700',
              )}
            >
              {k === 'del' ? (
                <Delete className="size-6" />
              ) : k === 'ok' ? (
                <span className="font-sans text-base font-semibold">Entrar</span>
              ) : (
                k
              )}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-5 text-sm text-bone-100/60 hover:text-bone-50">
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  );
}

function SuccessOverlay({ result, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [onClose]);
  const isIn = result.type === 'check_in';
  return (
    <motion.button
      type="button"
      onClick={onClose}
      className={cn('fixed inset-0 z-50 grid place-items-center p-6 text-center', isIn ? 'bg-sinu-600' : 'bg-onyx-800')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div>
        <motion.div
          className="mx-auto grid size-28 place-items-center rounded-full bg-white/15"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          {isIn ? <LogIn className="size-12 text-white" /> : <LogOut className="size-12 text-white" />}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="display mt-8 text-[clamp(3.5rem,10vw,7rem)] text-white">
            {isIn ? `Bienvenido, ${firstName(result.barber_name)}` : `Hasta mañana, ${firstName(result.barber_name)}`}
          </p>
          <p className="mt-3 text-xl text-white/80">
            {isIn ? 'Entrada' : 'Salida'} registrada a las {time(result.recorded_at)}
          </p>
          {result.is_late && (
            <p className="mx-auto mt-5 w-fit rounded-full bg-white/15 px-4 py-1.5 text-white">Llegada después de la tolerancia</p>
          )}
        </motion.div>
      </div>
    </motion.button>
  );
}

export default function Kiosk() {
  usePageTitle('Kiosco de asistencia');
  const { role, profile } = useAuth();
  const { data: branches = [] } = useBranches();
  const now = useNow();
  const [adminBranch, setAdminBranch] = useState(() => {
    try {
      return localStorage.getItem(BRANCH_KEY);
    } catch {
      return null;
    }
  });
  const branchId =
    role === 'receptionist' ? profile?.branch_id : branches.some((b) => b.id === adminBranch) ? adminBranch : branches[0]?.id;
  const branch = branches.find((b) => b.id === branchId);
  const board = useKioskBoard(branchId);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const closeResult = useCallback(() => setResult(null), []);
  const closePad = useCallback(() => setSelected(null), []);
  const onDone = useCallback((res) => {
    setSelected(null);
    setResult(res);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-onyx-950 text-bone-50">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            to="/panel"
            className="grid size-10 place-items-center rounded-full text-bone-100/60 hover:bg-bone-100/10 hover:text-bone-50"
            aria-label="Volver al panel"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo to="/kiosco" />
        </div>
        <div className="flex items-center gap-3">
          {role === 'admin' && branches.length > 1 ? (
            <select
              value={branchId ?? ''}
              onChange={(e) => {
                setAdminBranch(e.target.value);
                try {
                  localStorage.setItem(BRANCH_KEY, e.target.value);
                } catch {
                  /* sin almacenamiento */
                }
              }}
              className="h-10 rounded-md border border-bone-100/15 bg-onyx-900 px-3 text-sm"
              aria-label="Sede del kiosco"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Sede {shortBranch(b.name)}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-bone-100/70">Sede {shortBranch(branch?.name ?? '')}</span>
          )}
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="grid size-10 place-items-center rounded-full text-bone-100/60 hover:bg-bone-100/10 hover:text-bone-50"
            aria-label="Pantalla completa"
          >
            <Expand className="size-5" />
          </button>
        </div>
      </header>

      <div className="px-6 pb-8 pt-4 sm:px-10">
        <p className="display tabular text-[clamp(5rem,14vw,10rem)]">
          {time(now).replace(/ [ap]\. m\./, '')}
          <span className="ml-3 align-top text-[0.3em] text-bone-100/60">{time(now).includes('a. m.') ? 'a. m.' : 'p. m.'}</span>
        </p>
        <p className="text-xl text-bone-100/70 first-letter:uppercase">{longDate(todayISO())}</p>
        <p className="mt-6 text-lg text-bone-100/80">Toca tu foto y digita tu PIN para marcar entrada o salida.</p>
      </div>

      <main className="flex-1 px-6 pb-10 sm:px-10">
        {board.error ? (
          <ErrorState error={board.error} onRetry={board.refetch} className="text-bone-50" />
        ) : board.isPending ? (
          <PageLoader dark />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {board.data.map((b) => {
              const s = statusText(b);
              return (
                <button
                  key={b.barber_id}
                  type="button"
                  disabled={!b.has_pin}
                  onClick={() => setSelected(b)}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-onyx-900 p-5 text-left ring-1 ring-bone-100/10 transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  <Img
                    src={sized(publicUrl('barbers', b.photo_url), 600)}
                    fallback={
                      <span aria-hidden className="display absolute -right-2 top-2 text-[8.5rem] text-gold-400/15">
                        {initials(b.display_name)}
                      </span>
                    }
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-onyx-950 via-onyx-950/30 to-transparent" />
                  <span className="relative">
                    <span className="display block text-4xl">{b.display_name}</span>
                    <span
                      className={cn(
                        'mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
                        s.tone === 'in' && 'bg-sinu-500 text-white',
                        s.tone === 'out' && 'bg-bone-100/15 text-bone-100',
                        s.tone === 'pending' && 'bg-gold-500/20 text-gold-300',
                        s.tone === 'off' && 'bg-bone-100/10 text-bone-100/60',
                      )}
                    >
                      {s.label}
                    </span>
                    {!b.has_pin && <span className="mt-1 block text-xs text-bone-100/60">Sin PIN asignado</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>{selected && <PinPad barber={selected} onClose={closePad} onDone={onDone} />}</AnimatePresence>
      <AnimatePresence>{result && <SuccessOverlay result={result} onClose={closeResult} />}</AnimatePresence>
    </div>
  );
}
