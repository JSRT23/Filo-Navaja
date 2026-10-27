import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCancelAppointment } from '@/api/booking';
import { errorMessage } from '@/lib/errors';
import { longDate, time } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';

const REASONS = ['Me surgió un compromiso', 'Me queda mejor otro día', 'Estoy enfermo', 'Ya me atendieron'];

export function CancelModal({ appointment, open, onOpenChange, onDone, staff = false }) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const cancel = useCancelAppointment();

  useEffect(() => {
    if (open) {
      setReason('');
      setDetail('');
    }
  }, [open]);

  if (!appointment) return null;
  const reasons = staff ? ['El cliente avisó que no viene', 'El barbero no puede atender', 'Cita duplicada', 'Otro'] : REASONS;

  const submit = async () => {
    try {
      await cancel.mutateAsync({ id: appointment.id, reason: [reason, detail.trim()].filter(Boolean).join('. ') });
      toast.success('Cita cancelada');
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error('No se pudo cancelar', { description: errorMessage(e) });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Cancelar cita"
      description={`${appointment.service_name} del ${longDate(appointment.starts_at)} a las ${time(appointment.starts_at)}.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Mantener la cita
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={submit}>
            Cancelar cita
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">
        {staff ? 'El cliente recibe un correo avisando la cancelación.' : 'El horario queda libre para otra persona. ¿Nos cuentas por qué?'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {reasons.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={reason === r}
            onClick={() => setReason(reason === r ? '' : r)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition-colors',
              reason === r ? 'bg-cordovan-900 text-bone-50 ring-cordovan-900' : 'bg-white text-ink-soft ring-line hover:ring-line-strong',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <Field label="Comentario" optional className="mt-4">
        {(p) => <Textarea {...p} rows={2} maxLength={200} value={detail} onChange={(e) => setDetail(e.target.value)} />}
      </Field>
    </Modal>
  );
}
