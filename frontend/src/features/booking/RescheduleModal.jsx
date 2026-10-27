import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useBarbers } from '@/api/catalog';
import { useAvailableDates, useBarberSlots, useRescheduleAppointment } from '@/api/booking';
import { errorMessage } from '@/lib/errors';
import { longDate, time } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { DateStrip, SlotGrid } from './SlotPicker';

/** Reprogramar una cita: mismo servicio y sede; se puede cambiar de barbero */
export function RescheduleModal({ appointment, open, onOpenChange, onDone }) {
  const { data: barbers = [] } = useBarbers();
  const [barberId, setBarberId] = useState(appointment?.barber_id);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const reschedule = useRescheduleAppointment();

  useEffect(() => {
    if (open && appointment) {
      setBarberId(appointment.barber_id);
      setDate(null);
      setSlot(null);
    }
  }, [open, appointment]);

  const options = useMemo(
    () => barbers.filter((b) => b.branch_id === appointment?.branch_id && b.serviceIds.includes(appointment?.service_id)),
    [barbers, appointment],
  );
  const dates = useAvailableDates({ serviceId: appointment?.service_id, branchId: appointment?.branch_id, barberId });
  const slots = useBarberSlots({ barberId, serviceId: appointment?.service_id, date, ignoreId: appointment?.id });

  useEffect(() => {
    const first = dates.data?.[0]?.available_on;
    if (open && first && !date) setDate(first);
  }, [open, dates.data, date]);

  if (!appointment) return null;

  const save = async () => {
    try {
      await reschedule.mutateAsync({
        id: appointment.id,
        startsAt: slot.slot_start,
        barberId: barberId !== appointment.barber_id ? barberId : null,
      });
      toast.success('Cita reprogramada', { description: `${longDate(slot.slot_start)}, ${time(slot.slot_start)}` });
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error('No se pudo reprogramar', { description: errorMessage(e) });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Reprogramar cita"
      description={`${appointment.service_name}. Hoy está para el ${longDate(appointment.starts_at)} a las ${time(appointment.starts_at)}.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button variant="dark" disabled={!slot} loading={reschedule.isPending} onClick={save}>
            {slot ? `Cambiar a las ${time(slot.slot_start)}` : 'Elige un horario'}
          </Button>
        </>
      }
    >
      {options.length > 1 && (
        <Field label="Barbero" className="mb-5 max-w-xs">
          {(p) => (
            <Select
              {...p}
              value={barberId}
              onChange={(e) => {
                setBarberId(e.target.value);
                setDate(null);
                setSlot(null);
              }}
            >
              {options.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <DateStrip
        available={dates.data}
        loading={dates.isPending}
        value={date}
        onChange={(d) => {
          setDate(d);
          setSlot(null);
        }}
      />
      {date && <p className="mb-3 mt-5 font-semibold first-letter:uppercase">{longDate(date)}</p>}
      <SlotGrid slots={slots.data ?? []} loading={slots.isPending && Boolean(date)} value={slot?.slot_start} onChange={setSlot} />
    </Modal>
  );
}
