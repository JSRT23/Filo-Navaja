import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useServices, groupByCategory } from '@/api/catalog';
import { useBarberSlots } from '@/api/booking';
import { useStaffCreateAppointment } from '@/api/panel';
import { CustomerPicker } from '@/features/customers/CustomerPicker';
import { SlotGrid } from '@/features/booking/SlotPicker';
import { errorMessage } from '@/lib/errors';
import { clock, localToInstant, longDate, money, time, todayISO, toISODate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/Feedback';

const SOURCES = [
  { value: 'reception', label: 'En recepción' },
  { value: 'phone', label: 'Teléfono o WhatsApp' },
  { value: 'walk_in', label: 'Llegó sin cita' },
];

function nowRounded() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
  return d.toISOString();
}

export function NewAppointmentModal({ open, onOpenChange, barbers, defaults }) {
  const { data: services = [] } = useServices();
  const create = useStaffCreateAppointment();
  const [customer, setCustomer] = useState(null);
  const [source, setSource] = useState('reception');
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState(null);
  const [manualTime, setManualTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setCustomer(null);
    setSource('reception');
    setServiceId('');
    setBarberId(defaults?.barberId ?? '');
    setDate(defaults?.date ?? todayISO());
    setSlot(null);
    setManualTime(defaults?.time ?? '');
    setNotes('');
  }, [open, defaults]);

  const options = useMemo(() => barbers.filter((b) => !serviceId || b.serviceIds.includes(serviceId)), [barbers, serviceId]);
  useEffect(() => {
    if (barberId && serviceId && !options.some((b) => b.id === barberId)) setBarberId('');
  }, [options, barberId, serviceId]);

  const slots = useBarberSlots({ barberId: source === 'walk_in' ? null : barberId, serviceId, date });
  const service = services.find((s) => s.id === serviceId);

  const startsAt = source === 'walk_in' ? nowRounded() : manualTime ? localToInstant(date, manualTime) : slot?.slot_start;
  const ready = customer?.id && serviceId && barberId && startsAt;

  const submit = async () => {
    try {
      await create.mutateAsync({ customerId: customer.id, barberId, serviceId, startsAt, source, notes });
      toast.success(source === 'walk_in' ? 'Cliente en la silla' : 'Cita agendada', {
        description: `${longDate(startsAt)}, ${time(startsAt)}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error('No se pudo agendar', { description: errorMessage(e) });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Nueva cita"
      description="Para clientes que llaman, escriben o llegan a la sede."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={!ready} loading={create.isPending} onClick={submit}>
            {source === 'walk_in' ? 'Pasar a la silla' : startsAt ? `Agendar a las ${time(startsAt)}` : 'Agendar'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Cliente">{() => <CustomerPicker value={customer} onChange={setCustomer} />}</Field>

        <div>
          <p className="mb-1.5 text-sm font-medium">¿Cómo llegó?</p>
          <Segmented value={source} onChange={setSource} options={SOURCES} size="sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Servicio">
            {(p) => (
              <Select {...p} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Elige un servicio</option>
                {groupByCategory(services).map((g) => (
                  <optgroup key={g.category.name} label={g.category.name}>
                    {g.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}, {money(s.price)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Barbero">
            {(p) => (
              <Select {...p} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
                <option value="">Elige un barbero</option>
                {options.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {source === 'walk_in' ? (
          <InlineAlert tone="sinu">La cita empieza ahora ({time(nowRounded())}) y queda en estado «En silla».</InlineAlert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha">
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    min={todayISO()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setSlot(null);
                    }}
                  />
                )}
              </Field>
              <Field label="Otra hora" optional hint="Si la hora no aparece en la lista">
                {(p) => (
                  <Input
                    {...p}
                    type="time"
                    step={300}
                    value={manualTime}
                    onChange={(e) => {
                      setManualTime(e.target.value);
                      setSlot(null);
                    }}
                  />
                )}
              </Field>
            </div>
            {barberId && serviceId ? (
              <div>
                <p className="mb-2 text-sm font-medium">Horarios libres de {options.find((b) => b.id === barberId)?.display_name}</p>
                <SlotGrid
                  slots={slots.data ?? []}
                  loading={slots.isPending}
                  value={slot?.slot_start}
                  onChange={(s) => {
                    setSlot(s);
                    setManualTime('');
                  }}
                  emptyText="No hay horarios libres en línea para ese día. Puedes escribir otra hora."
                />
                {manualTime && (
                  <p className="mt-3 text-sm text-ink-soft">
                    Se agenda a las <strong>{clock(manualTime)}</strong> del{' '}
                    {toISODate(localToInstant(date, manualTime)) === date ? longDate(date) : date}.
                    {service
                      ? ` Termina a las ${time(new Date(new Date(localToInstant(date, manualTime)).getTime() + service.duration_minutes * 60000))}.`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-md bg-paper px-4 py-4 text-sm text-ink-soft">Elige servicio y barbero para ver los horarios.</p>
            )}
          </>
        )}

        <Field label="Notas internas" optional>
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: pidió degradado bajo, viene con el hijo"
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
