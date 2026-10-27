import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSaveBarber, useTimeOff, useTimeOffActions } from '@/api/admin';
import { groupByCategory, useServices } from '@/api/catalog';
import { errorMessage } from '@/lib/errors';
import { TIME_OFF_LABEL, WEEK_ORDER, WEEKDAYS } from '@/lib/constants';
import { dateTime, localToInstant, todayISO } from '@/lib/format';
import { Drawer } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Checkbox, Field, Input, Segmented, Select, Switch, Textarea } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { shortBranch } from '@/components/site/Branches';

const hhmm = (t) => (t ? t.slice(0, 5) : '');

function scheduleState(barber) {
  return WEEK_ORDER.map((weekday) => {
    const s = barber.barber_schedules?.find((x) => x.weekday === weekday);
    return {
      weekday,
      enabled: Boolean(s),
      start_time: hhmm(s?.start_time) || (weekday === 0 ? '10:00' : '09:00'),
      end_time: hhmm(s?.end_time) || (weekday === 0 ? '16:00' : '19:00'),
      break_start: hhmm(s?.break_start),
      break_end: hhmm(s?.break_end),
    };
  });
}

function TimeOffSection({ barberId }) {
  const { data = [] } = useTimeOff(barberId);
  const { add, remove } = useTimeOffActions();
  const [f, setF] = useState({ type: 'leave', from: todayISO(), fromTime: '09:00', to: todayISO(), toTime: '20:00', reason: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    try {
      await add.mutateAsync({
        barber_id: barberId,
        type: f.type,
        starts_at: localToInstant(f.from, f.fromTime),
        ends_at: localToInstant(f.to, f.toTime),
        reason: f.reason || null,
      });
      toast.success('Novedad registrada', { description: 'Esos horarios dejan de ofrecerse en línea.' });
      set('reason', '');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        Permisos, incapacidades o vacaciones. Mientras dure la novedad no se ofrecen horarios con este barbero.
      </p>
      <div className="grid gap-3 rounded-md bg-paper p-4 sm:grid-cols-2">
        <Field label="Tipo" className="sm:col-span-2">
          {(p) => (
            <Select {...p} value={f.type} onChange={(e) => set('type', e.target.value)}>
              {Object.entries(TIME_OFF_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Desde">
          {(p) => (
            <div className="flex gap-2">
              <Input {...p} type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
              <Input
                type="time"
                value={f.fromTime}
                onChange={(e) => set('fromTime', e.target.value)}
                aria-label="Hora de inicio"
                className="w-28"
              />
            </div>
          )}
        </Field>
        <Field label="Hasta">
          {(p) => (
            <div className="flex gap-2">
              <Input {...p} type="date" value={f.to} min={f.from} onChange={(e) => set('to', e.target.value)} />
              <Input
                type="time"
                value={f.toTime}
                onChange={(e) => set('toTime', e.target.value)}
                aria-label="Hora de fin"
                className="w-28"
              />
            </div>
          )}
        </Field>
        <Field label="Motivo" optional className="sm:col-span-2">
          {(p) => <Input {...p} value={f.reason} onChange={(e) => set('reason', e.target.value)} />}
        </Field>
        <Button variant="dark" size="sm" className="sm:col-span-2 sm:justify-self-start" loading={add.isPending} onClick={submit}>
          Registrar novedad
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {data.length === 0 && <li className="py-4 text-sm text-ink-mute">Sin novedades recientes.</li>}
        {data.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{TIME_OFF_LABEL[t.type]}</p>
              <p className="text-ink-mute">
                {dateTime(t.starts_at)} a {dateTime(t.ends_at)}
                {t.reason ? `. ${t.reason}` : ''}
              </p>
            </div>
            <IconButton label="Eliminar novedad" size="icon-sm" variant="danger-ghost" onClick={() => remove.mutate(t.id)}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarberEditor({ barber, branches, onClose }) {
  const { data: services = [] } = useServices();
  const save = useSaveBarber();
  const [tab, setTab] = useState('perfil');
  const [f, setF] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [serviceIds, setServiceIds] = useState([]);
  const [rates, setRates] = useState({ service: 55, product: 10 });
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!barber) return;
    setTab('perfil');
    setF({
      id: barber.id,
      display_name: barber.display_name,
      bio: barber.bio ?? '',
      specialties: (barber.specialties ?? []).join(', '),
      instagram: barber.instagram ?? '',
      calendar_color: barber.calendar_color,
      accepts_online_booking: barber.accepts_online_booking,
      is_active: barber.is_active,
      sort_order: barber.sort_order,
      branch_id: barber.branch_id,
    });
    setSchedules(scheduleState(barber));
    setServiceIds(barber.serviceIds ?? []);
    setRates({
      service: Number(barber.compensation?.service_commission_rate ?? 55),
      product: Number(barber.compensation?.product_commission_rate ?? 10),
    });
    setPin('');
  }, [barber]);

  if (!barber || !f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setDay = (weekday, patch) => setSchedules((list) => list.map((s) => (s.weekday === weekday ? { ...s, ...patch } : s)));

  const submit = async () => {
    if (pin && !/^\d{4,6}$/.test(pin)) return toast.error('El PIN debe tener entre 4 y 6 dígitos');
    const bad = schedules.find(
      (s) => s.enabled && (s.start_time >= s.end_time || (s.break_start && (!s.break_end || s.break_start >= s.break_end))),
    );
    if (bad) return toast.error(`Revisa el horario del ${WEEKDAYS[bad.weekday].toLowerCase()}`);
    try {
      await save.mutateAsync({
        barber: {
          ...f,
          bio: f.bio.trim() || null,
          instagram: f.instagram.trim().replace('@', '') || null,
          specialties: f.specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          sort_order: Number(f.sort_order) || 0,
        },
        schedules,
        serviceIds,
        compensation: rates,
        pin: pin || null,
      });
      toast.success('Ficha guardada');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Drawer
      open={Boolean(barber)}
      onOpenChange={(o) => !o && onClose()}
      title="Ficha del barbero"
      width="max-w-2xl"
      footer={
        tab !== 'novedades' && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="dark" loading={save.isPending} onClick={submit}>
              Guardar cambios
            </Button>
          </>
        )
      }
    >
      <div className="p-5">
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={f.display_name} src={barber.photo} size="lg" color={f.calendar_color} />
          <div>
            <p className="semi-condensed text-2xl font-bold">{f.display_name}</p>
            <p className="text-sm text-ink-mute">{barber.profile?.email}</p>
          </div>
        </div>
        <Segmented
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'perfil', label: 'Perfil' },
            { value: 'horario', label: 'Horario' },
            { value: 'servicios', label: 'Servicios' },
            { value: 'pago', label: 'Comisión y PIN' },
            { value: 'novedades', label: 'Novedades' },
          ]}
        />

        <div className="mt-6">
          {tab === 'perfil' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre visible">
                {(p) => <Input {...p} value={f.display_name} onChange={(e) => set('display_name', e.target.value)} />}
              </Field>
              <Field label="Sede">
                {(p) => (
                  <Select {...p} value={f.branch_id} onChange={(e) => set('branch_id', e.target.value)}>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {shortBranch(b.name)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Presentación" className="sm:col-span-2" hint="Se muestra en la web">
                {(p) => <Textarea {...p} rows={3} maxLength={280} value={f.bio} onChange={(e) => set('bio', e.target.value)} />}
              </Field>
              <Field label="Especialidades" hint="Separadas por coma">
                {(p) => <Input {...p} value={f.specialties} onChange={(e) => set('specialties', e.target.value)} />}
              </Field>
              <Field label="Instagram" optional>
                {(p) => <Input {...p} value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="usuario" />}
              </Field>
              <Field label="Color en la agenda">
                {(p) => (
                  <div className="flex items-center gap-3">
                    <input
                      {...p}
                      type="color"
                      value={f.calendar_color}
                      onChange={(e) => set('calendar_color', e.target.value.toUpperCase())}
                      className="h-11 w-16 cursor-pointer rounded-sm border border-line-strong bg-white p-1"
                    />
                    <span className="font-mono text-sm text-ink-soft">{f.calendar_color}</span>
                  </div>
                )}
              </Field>
              <Field label="Orden en la web">
                {(p) => <Input {...p} type="number" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} />}
              </Field>
              <Switch
                className="sm:col-span-2"
                label="Recibe reservas en línea"
                description="Si lo apagas, solo se agenda desde recepción"
                checked={f.accepts_online_booking}
                onChange={(v) => set('accepts_online_booking', v)}
              />
              <Switch
                className="sm:col-span-2"
                label="Activo"
                description="Un barbero inactivo no aparece en la web, la agenda ni el kiosco"
                checked={f.is_active}
                onChange={(v) => set('is_active', v)}
              />
            </div>
          )}

          {tab === 'horario' && (
            <div className="space-y-2">
              <p className="mb-4 text-sm text-ink-soft">Horario semanal de trabajo. El descanso (almuerzo) es opcional.</p>
              {schedules.map((s) => (
                <div
                  key={s.weekday}
                  className="grid grid-cols-[7rem_1fr] items-center gap-3 rounded-md px-3 py-2.5 odd:bg-paper sm:grid-cols-[8rem_1fr_1fr]"
                >
                  <Checkbox
                    checked={s.enabled}
                    onChange={(e) => setDay(s.weekday, { enabled: e.target.checked })}
                    label={WEEKDAYS[s.weekday]}
                  />
                  {s.enabled ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Input
                          type="time"
                          value={s.start_time}
                          onChange={(e) => setDay(s.weekday, { start_time: e.target.value })}
                          className="h-9"
                          aria-label={`Entrada ${WEEKDAYS[s.weekday]}`}
                        />
                        <span className="text-ink-mute">a</span>
                        <Input
                          type="time"
                          value={s.end_time}
                          onChange={(e) => setDay(s.weekday, { end_time: e.target.value })}
                          className="h-9"
                          aria-label={`Salida ${WEEKDAYS[s.weekday]}`}
                        />
                      </div>
                      <div className="col-start-2 flex items-center gap-2 text-sm sm:col-start-auto">
                        <span className="shrink-0 text-ink-mute">Descanso</span>
                        <Input
                          type="time"
                          value={s.break_start}
                          onChange={(e) => setDay(s.weekday, { break_start: e.target.value })}
                          className="h-9"
                          aria-label={`Inicio de descanso ${WEEKDAYS[s.weekday]}`}
                        />
                        <Input
                          type="time"
                          value={s.break_end}
                          onChange={(e) => setDay(s.weekday, { break_end: e.target.value })}
                          className="h-9"
                          aria-label={`Fin de descanso ${WEEKDAYS[s.weekday]}`}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-ink-mute sm:col-span-2">Descansa</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'servicios' && (
            <div>
              <div className="mb-3 flex gap-3 text-sm">
                <button
                  type="button"
                  className="font-medium text-gold-700 hover:underline"
                  onClick={() => setServiceIds(services.map((s) => s.id))}
                >
                  Marcar todos
                </button>
                <button type="button" className="font-medium text-ink-soft hover:underline" onClick={() => setServiceIds([])}>
                  Ninguno
                </button>
              </div>
              {groupByCategory(services).map((g) => (
                <fieldset key={g.category.name} className="mb-5">
                  <legend className="mb-2 text-sm font-semibold text-ink-soft">{g.category.name}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((s) => (
                      <Checkbox
                        key={s.id}
                        checked={serviceIds.includes(s.id)}
                        onChange={(e) => setServiceIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                        label={s.name}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {tab === 'pago' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Comisión sobre servicios (%)">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={rates.service}
                      onChange={(e) => setRates({ ...rates, service: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Comisión sobre productos (%)">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={rates.product}
                      onChange={(e) => setRates({ ...rates, product: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>
              <p className="text-sm text-ink-soft">
                Los cambios aplican a las ventas nuevas. Lo ya vendido conserva el porcentaje con que se registró.
              </p>
              <Field label="Nuevo PIN del kiosco" optional hint="4 a 6 dígitos. Al guardar se reemplaza el anterior y se desbloquea.">
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="max-w-40"
                  />
                )}
              </Field>
            </div>
          )}

          {tab === 'novedades' && <TimeOffSection barberId={barber.id} />}
        </div>
      </div>
    </Drawer>
  );
}
