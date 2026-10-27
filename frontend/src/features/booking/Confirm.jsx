import { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarPlus, Check, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { duration, firstName, longDate, money, time } from '@/lib/format';
import { useAuth } from '@/features/auth/context';
import { LoginForm, RegisterForm } from '@/features/auth/forms';
import { shortBranch } from '@/components/site/Branches';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Segmented, Textarea } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/Feedback';
import { Link } from 'react-router-dom';
import { googleCalendarUrl } from './calendar';

export function StepConfirm({ branch, service, slot, notes, onNotes, onConfirm, submitting, settings }) {
  const { user, isStaff, customer, refresh } = useAuth();
  const [authTab, setAuthTab] = useState('login');
  const [consent, setConsent] = useState(false);
  const needsConsent = Boolean(user && customer && !customer.data_consent_at);
  const cancelHours = Math.round(Number(settings?.cancellation_window_minutes ?? 120) / 60);

  const handleConfirm = async () => {
    if (needsConsent) {
      if (!consent) return toast.error('Acepta la política de datos para reservar');
      const { error } = await supabase.from('customers').update({ data_consent_at: new Date().toISOString() }).eq('id', customer.id);
      if (error) return toast.error(errorMessage(error));
      await refresh();
    }
    onConfirm();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="display text-5xl text-onyx-900 sm:text-6xl">Revisa y confirma</h2>
        <p className="mt-2 text-ink-soft">Puedes cancelar o reprogramar desde tu cuenta hasta {cancelHours} horas antes.</p>
      </div>

      <dl className="divide-y divide-line rounded-lg bg-white ring-1 ring-line">
        {[
          ['Sede', `${shortBranch(branch.name)}, ${branch.address}`],
          ['Servicio', `${service.name} (${duration(service.duration_minutes)})`],
          ['Barbero', slot.barberName],
          ['Fecha', longDate(slot.start)],
          ['Hora', time(slot.start)],
          ['Valor', money(service.price)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 px-5 py-3.5">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right font-semibold first-letter:uppercase">{v}</dd>
          </div>
        ))}
      </dl>

      {!user ? (
        <div className="mt-8 rounded-lg bg-white p-6 ring-1 ring-line">
          <p className="font-semibold text-ink">Para confirmar, ingresa o crea tu cuenta</p>
          <p className="mt-1 text-sm text-ink-soft">Así te llega la confirmación y puedes administrar tu cita. Tu selección se mantiene.</p>
          <Segmented
            className="mt-5"
            value={authTab}
            onChange={setAuthTab}
            options={[
              { value: 'login', label: 'Ya tengo cuenta' },
              { value: 'register', label: 'Soy nuevo' },
            ]}
          />
          <div className="mt-6">{authTab === 'login' ? <LoginForm /> : <RegisterForm />}</div>
        </div>
      ) : isStaff ? (
        <InlineAlert tone="amber" className="mt-8">
          Ingresaste con una cuenta del personal. Para agendarle a un cliente usa la{' '}
          <Link to="/panel/agenda" className="font-semibold underline">
            agenda del panel
          </Link>
          .
        </InlineAlert>
      ) : (
        <div className="mt-8 space-y-5">
          <Field label="¿Algo que deba saber tu barbero?" optional hint="Por ejemplo: quiero conservar el largo arriba.">
            {(p) => <Textarea {...p} maxLength={300} value={notes} onChange={(e) => onNotes(e.target.value)} />}
          </Field>
          {needsConsent && (
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              label={
                <>
                  Autorizo el tratamiento de mis datos según la{' '}
                  <Link to="/privacidad" target="_blank" className="font-medium text-gold-700 underline">
                    política de datos
                  </Link>
                  .
                </>
              }
            />
          )}
          <Button variant="primary" size="lg" className="w-full sm:w-auto" loading={submitting} onClick={handleConfirm}>
            Confirmar reserva
          </Button>
        </div>
      )}
    </div>
  );
}

/** Confirmación animada después de reservar */
export function BookingSuccess({ booking, onAnother }) {
  const { profile } = useAuth();
  const { branch, service, slot } = booking;
  const calendar = googleCalendarUrl({
    title: `${service.name} en Filo & Navaja`,
    start: slot.start,
    end: slot.end,
    details: `Con ${slot.barberName}. Llega 5 minutos antes.`,
    location: `${branch.address}, ${branch.city}`,
  });

  return (
    <div className="mx-auto max-w-xl py-6 text-center">
      <motion.div
        className="mx-auto grid size-20 place-items-center rounded-full bg-sinu-500 text-white"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="size-10"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, duration: 0.45, ease: 'easeOut' }}
          />
        </motion.svg>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
        <h2 className="display mt-6 text-6xl text-onyx-900">
          Turno reservado{profile?.full_name ? `, ${firstName(profile.full_name)}` : ''}
        </h2>
        <p className="mt-3 text-lg text-ink-soft">
          Te esperamos el <span className="font-semibold text-ink">{longDate(slot.start)}</span> a las{' '}
          <span className="font-semibold text-ink">{time(slot.start)}</span> en {shortBranch(branch.name)} con {firstName(slot.barberName)}.
        </p>
        <p className="mt-2 text-sm text-ink-mute">Te enviamos la confirmación por correo y te recordaremos un día antes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={calendar} target="_blank" rel="noreferrer" variant="outline">
            <CalendarPlus className="size-4" aria-hidden /> Agregar a mi calendario
          </Button>
          <Button to="/mi-cuenta" variant="dark">
            <ListChecks className="size-4" aria-hidden /> Ver mis citas
          </Button>
        </div>
        <button
          type="button"
          onClick={onAnother}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:underline"
        >
          <Check className="size-4" aria-hidden /> Reservar otro turno
        </button>
      </motion.div>
    </div>
  );
}
