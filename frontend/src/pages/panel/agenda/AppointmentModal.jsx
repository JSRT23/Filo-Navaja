import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeDollarSign, CalendarClock, Check, Mail, Phone, Scissors, UserX, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSetAppointmentStatus, useUpdateAppointmentNotes } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { RescheduleModal } from '@/features/booking/RescheduleModal';
import { CancelModal } from '@/features/booking/CancelModal';
import { WhatsAppGlyph } from '@/components/brand/Glyphs';
import { errorMessage } from '@/lib/errors';
import { SOURCE_LABEL } from '@/lib/constants';
import { dateTime, duration, longDate, money, phone, telLink, time, whatsappLink, firstName } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Field, Textarea } from '@/components/ui/Field';

export function AppointmentModal({ appointment: a, open, onOpenChange }) {
  const navigate = useNavigate();
  const { isFrontDesk } = useAuth();
  const setStatus = useSetAppointmentStatus();
  const saveNotes = useUpdateAppointmentNotes();
  const [notes, setNotes] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (a) setNotes(a.internal_notes ?? '');
  }, [a]);

  if (!a) return null;
  const started = new Date(a.starts_at) <= new Date();

  const change = async (status, label) => {
    try {
      await setStatus.mutateAsync({ id: a.id, status });
      toast.success(label);
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const actions = [];
  if (a.status === 'pending')
    actions.push({
      key: 'confirm',
      label: 'Confirmar',
      icon: Check,
      variant: 'outline',
      onClick: () => change('confirmed', 'Cita confirmada'),
    });
  if (['pending', 'confirmed'].includes(a.status))
    actions.push({
      key: 'in',
      label: 'Llegó, pasa a la silla',
      icon: Scissors,
      variant: 'dark',
      onClick: () => change('in_progress', `${firstName(a.customer_name)} está en la silla`),
    });
  if (['pending', 'confirmed'].includes(a.status) && started)
    actions.push({
      key: 'noshow',
      label: 'No asistió',
      icon: UserX,
      variant: 'danger-ghost',
      onClick: () => change('no_show', 'Marcada como no asistió'),
    });
  if (a.status === 'in_progress')
    actions.push({
      key: 'done',
      label: 'Terminar servicio',
      icon: Check,
      variant: 'dark',
      onClick: () => change('completed', 'Servicio terminado'),
    });
  if (isFrontDesk && ['in_progress', 'completed', 'confirmed'].includes(a.status))
    actions.push({
      key: 'pay',
      label: 'Cobrar',
      icon: BadgeDollarSign,
      variant: 'primary',
      onClick: () => navigate(`/panel/caja?cita=${a.id}`),
    });

  return (
    <>
      <Modal
        open={open && !rescheduling && !cancelling}
        onOpenChange={onOpenChange}
        size="lg"
        title={a.customer_name}
        description={`${a.service_name} con ${a.barber_name}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={a.status} />
          <span className="text-sm text-ink-mute">{SOURCE_LABEL[a.source]}</span>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-mute">Fecha</dt>
            <dd className="font-medium first-letter:uppercase">{longDate(a.starts_at)}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Hora</dt>
            <dd className="font-medium">
              {time(a.starts_at)} a {time(a.ends_at)} ({duration(a.duration_minutes)})
            </dd>
          </div>
          <div>
            <dt className="text-ink-mute">Valor</dt>
            <dd className="tabular font-medium">{money(a.price)}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Contacto</dt>
            <dd className="flex flex-wrap gap-2 pt-0.5">
              {a.customer_phone && (
                <>
                  <a
                    href={telLink(a.customer_phone)}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-paper px-2 py-1 font-medium hover:bg-line"
                  >
                    <Phone className="size-3.5" aria-hidden /> {phone(a.customer_phone)}
                  </a>
                  <a
                    href={whatsappLink(
                      a.customer_phone.length === 10 ? `57${a.customer_phone}` : a.customer_phone,
                      `Hola ${firstName(a.customer_name)}, te escribimos de Filo & Navaja por tu cita de las ${time(a.starts_at)}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-sinu-50 px-2 py-1 font-medium text-sinu-600 hover:bg-sinu-100"
                  >
                    <WhatsAppGlyph className="size-3.5" /> WhatsApp
                  </a>
                </>
              )}
              {a.customer_email && (
                <a
                  href={`mailto:${a.customer_email}`}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-paper px-2 py-1 font-medium hover:bg-line"
                >
                  <Mail className="size-3.5" aria-hidden /> Correo
                </a>
              )}
              {!a.customer_phone && !a.customer_email && <span className="text-ink-mute">Sin datos</span>}
            </dd>
          </div>
        </dl>

        {a.customer_notes && (
          <div className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-600">Nota del cliente</p>
            <p className="mt-0.5 text-ink">{a.customer_notes}</p>
          </div>
        )}
        {a.status === 'cancelled' && (
          <p className="mt-5 rounded-md bg-pole-50 px-4 py-3 text-sm text-pole-600">
            Cancelada el {dateTime(a.cancelled_at)}
            {a.cancellation_reason ? `: ${a.cancellation_reason}` : ''}
          </p>
        )}

        {isFrontDesk && (
          <div className="mt-5">
            <Field label="Notas internas" hint="Solo las ve el personal.">
              {(p) => <Textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>
            {notes !== (a.internal_notes ?? '') && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                loading={saveNotes.isPending}
                onClick={async () => {
                  try {
                    await saveNotes.mutateAsync({ id: a.id, internal_notes: notes || null });
                    toast.success('Nota guardada');
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
              >
                Guardar nota
              </Button>
            )}
          </div>
        )}

        {(actions.length > 0 || (isFrontDesk && ['pending', 'confirmed'].includes(a.status))) && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {actions.map((x) => (
              <Button key={x.key} variant={x.variant} size="sm" onClick={x.onClick} disabled={setStatus.isPending}>
                <x.icon className="size-4" aria-hidden /> {x.label}
              </Button>
            ))}
            {isFrontDesk && ['pending', 'confirmed'].includes(a.status) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setRescheduling(true)}>
                  <CalendarClock className="size-4" aria-hidden /> Reprogramar
                </Button>
                <Button variant="danger-ghost" size="sm" onClick={() => setCancelling(true)}>
                  <XCircle className="size-4" aria-hidden /> Cancelar
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
      <RescheduleModal
        appointment={a}
        open={rescheduling}
        onOpenChange={(o) => {
          setRescheduling(o);
          if (!o) onOpenChange(false);
        }}
      />
      <CancelModal
        staff
        appointment={a}
        open={cancelling}
        onOpenChange={(o) => {
          setCancelling(o);
          if (!o) onOpenChange(false);
        }}
      />
    </>
  );
}
