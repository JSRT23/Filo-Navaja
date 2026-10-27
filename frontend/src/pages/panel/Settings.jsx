import { useEffect, useState } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminSettings, useSettingsActions } from '@/api/admin';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { WEEK_ORDER, WEEKDAYS } from '@/lib/constants';
import { longDate, todayISO } from '@/lib/format';
import { PageHeader, Panel } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { Button, IconButton } from '@/components/ui/Button';
import { Checkbox, Field, Input, Segmented, Select } from '@/components/ui/Field';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';

const RULES = [
  {
    title: 'Reservas en línea',
    keys: [
      'slot_interval_minutes',
      'min_booking_lead_minutes',
      'max_booking_days_ahead',
      'max_active_bookings_per_customer',
      'cancellation_window_minutes',
      'reminder_hours_before',
    ],
  },
  {
    title: 'Equipo y caja',
    keys: [
      'late_tolerance_minutes',
      'default_service_commission_rate',
      'default_product_commission_rate',
      'max_discount_percent_receptionist',
      'pin_max_attempts',
      'pin_lock_minutes',
    ],
  },
  { title: 'Datos personales', keys: ['privacy_policy_version'] },
];
const UNITS = {
  slot_interval_minutes: 'min',
  min_booking_lead_minutes: 'min',
  max_booking_days_ahead: 'días',
  cancellation_window_minutes: 'min',
  reminder_hours_before: 'horas',
  max_active_bookings_per_customer: 'citas',
  late_tolerance_minutes: 'min',
  default_service_commission_rate: '%',
  default_product_commission_rate: '%',
  max_discount_percent_receptionist: '%',
  pin_max_attempts: 'intentos',
  pin_lock_minutes: 'min',
};

function RulesSection({ settings }) {
  const { saveSetting } = useSettingsActions();
  const [values, setValues] = useState({});
  useEffect(
    () => setValues(Object.fromEntries(settings.map((s) => [s.key, typeof s.value === 'string' ? s.value : String(s.value)]))),
    [settings],
  );
  const original = Object.fromEntries(settings.map((s) => [s.key, s]));
  const changed = settings.filter(
    (s) => values[s.key] !== undefined && values[s.key] !== (typeof s.value === 'string' ? s.value : String(s.value)),
  );

  const save = async () => {
    try {
      for (const s of changed) {
        const raw = values[s.key];
        const value = typeof s.value === 'number' ? Number(raw) : raw;
        if (typeof s.value === 'number' && (!Number.isFinite(value) || value < 0)) throw new Error(`Valor inválido en «${s.description}»`);
        await saveSetting.mutateAsync({ key: s.key, value });
      }
      toast.success('Reglas guardadas', { description: 'Aplican de inmediato en reservas, caja y kiosco.' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Panel
      title="Reglas del negocio"
      description="Cambian el comportamiento de la app sin tocar código."
      actions={
        <Button variant="dark" size="sm" disabled={!changed.length} loading={saveSetting.isPending} onClick={save}>
          Guardar {changed.length ? `(${changed.length})` : ''}
        </Button>
      }
    >
      <div className="space-y-8">
        {RULES.map((group) => (
          <section key={group.title}>
            <h3 className="mb-3 text-sm font-semibold text-ink-soft">{group.title}</h3>
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {group.keys
                .filter((k) => original[k])
                .map((k) => (
                  <Field key={k} label={original[k].description}>
                    {(p) => (
                      <div className="relative">
                        <Input
                          {...p}
                          type={typeof original[k].value === 'number' ? 'number' : 'text'}
                          min={0}
                          value={values[k] ?? ''}
                          onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                          className={UNITS[k] ? 'pr-20' : ''}
                        />
                        {UNITS[k] && (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">
                            {UNITS[k]}
                          </span>
                        )}
                      </div>
                    )}
                  </Field>
                ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function BranchSection({ branch }) {
  const { saveBranch } = useSettingsActions();
  const [f, setF] = useState(null);
  const [hours, setHours] = useState([]);
  useEffect(() => {
    setF({
      name: branch.name,
      address: branch.address,
      neighborhood: branch.neighborhood ?? '',
      phone: branch.phone ?? '',
      whatsapp: branch.whatsapp ?? '',
      email: branch.email ?? '',
      latitude: branch.latitude ?? '',
      longitude: branch.longitude ?? '',
    });
    setHours(
      WEEK_ORDER.map((d) => {
        const h = branch.branch_hours?.find((x) => x.weekday === d);
        return {
          weekday: d,
          is_closed: h?.is_closed ?? false,
          opens_at: h?.opens_at?.slice(0, 5) ?? '09:00',
          closes_at: h?.closes_at?.slice(0, 5) ?? '20:00',
        };
      }),
    );
  }, [branch]);
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const bad = hours.find((h) => !h.is_closed && h.opens_at >= h.closes_at);
    if (bad) return toast.error(`Revisa el horario del ${WEEKDAYS[bad.weekday].toLowerCase()}`);
    try {
      await saveBranch.mutateAsync({
        id: branch.id,
        ...f,
        neighborhood: f.neighborhood || null,
        phone: f.phone || null,
        whatsapp: f.whatsapp || null,
        email: f.email || null,
        latitude: f.latitude === '' ? null : Number(f.latitude),
        longitude: f.longitude === '' ? null : Number(f.longitude),
        hours,
      });
      toast.success(`Sede ${shortBranch(f.name)} actualizada`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Panel
      title={`Sede ${shortBranch(branch.name)}`}
      actions={
        <Button variant="dark" size="sm" loading={saveBranch.isPending} onClick={submit}>
          Guardar sede
        </Button>
      }
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" className="sm:col-span-2">
            {(p) => <Input {...p} value={f.name} onChange={set('name')} />}
          </Field>
          <Field label="Dirección">{(p) => <Input {...p} value={f.address} onChange={set('address')} />}</Field>
          <Field label="Barrio">{(p) => <Input {...p} value={f.neighborhood} onChange={set('neighborhood')} />}</Field>
          <Field label="Teléfono">{(p) => <Input {...p} value={f.phone} onChange={set('phone')} />}</Field>
          <Field label="WhatsApp">{(p) => <Input {...p} value={f.whatsapp} onChange={set('whatsapp')} />}</Field>
          <Field label="Correo" className="sm:col-span-2">
            {(p) => <Input {...p} type="email" value={f.email} onChange={set('email')} />}
          </Field>
          <Field label="Latitud" hint="Para el mapa y «Cómo llegar»">
            {(p) => <Input {...p} type="number" step="0.000001" value={f.latitude} onChange={set('latitude')} />}
          </Field>
          <Field label="Longitud">
            {(p) => <Input {...p} type="number" step="0.000001" value={f.longitude} onChange={set('longitude')} />}
          </Field>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium">Horario de atención</p>
          <div className="space-y-1.5">
            {hours.map((h) => (
              <div key={h.weekday} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 rounded-md px-3 py-2 odd:bg-paper">
                <Checkbox
                  checked={!h.is_closed}
                  onChange={(e) =>
                    setHours((list) => list.map((x) => (x.weekday === h.weekday ? { ...x, is_closed: !e.target.checked } : x)))
                  }
                  label={WEEKDAYS[h.weekday]}
                />
                {h.is_closed ? (
                  <span className="text-sm text-ink-mute">Cerrado</span>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Input
                      type="time"
                      value={h.opens_at}
                      className="h-9"
                      aria-label={`Abre ${WEEKDAYS[h.weekday]}`}
                      onChange={(e) =>
                        setHours((list) => list.map((x) => (x.weekday === h.weekday ? { ...x, opens_at: e.target.value } : x)))
                      }
                    />
                    <span className="text-ink-mute">a</span>
                    <Input
                      type="time"
                      value={h.closes_at}
                      className="h-9"
                      aria-label={`Cierra ${WEEKDAYS[h.weekday]}`}
                      onChange={(e) =>
                        setHours((list) => list.map((x) => (x.weekday === h.weekday ? { ...x, closes_at: e.target.value } : x)))
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ClosuresSection({ closures, branches }) {
  const { addClosure, removeClosure } = useSettingsActions();
  const [f, setF] = useState({ closed_on: todayISO(), branch_id: 'all', reason: '' });
  const submit = async () => {
    try {
      await addClosure.mutateAsync({
        closed_on: f.closed_on,
        branch_id: f.branch_id === 'all' ? null : f.branch_id,
        reason: f.reason.trim(),
      });
      toast.success('Cierre programado', { description: 'Ese día ya no se ofrecen horarios en línea.' });
      setF({ ...f, reason: '' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const branchName = (id) => (id ? shortBranch(branches.find((b) => b.id === id)?.name) : 'Todas las sedes');
  return (
    <Panel title="Cierres programados" description="Festivos, inventarios o mantenimiento. Bloquean la reserva en línea ese día.">
      <div className="grid gap-3 sm:grid-cols-[10rem_12rem_1fr_auto] sm:items-end">
        <Field label="Fecha">
          {(p) => (
            <Input {...p} type="date" min={todayISO()} value={f.closed_on} onChange={(e) => setF({ ...f, closed_on: e.target.value })} />
          )}
        </Field>
        <Field label="Sede">
          {(p) => (
            <Select {...p} value={f.branch_id} onChange={(e) => setF({ ...f, branch_id: e.target.value })}>
              <option value="all">Todas las sedes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {shortBranch(b.name)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Motivo">
          {(p) => (
            <Input
              {...p}
              value={f.reason}
              onChange={(e) => setF({ ...f, reason: e.target.value })}
              placeholder="Ej.: Festivo de Todos los Santos"
            />
          )}
        </Field>
        <Button variant="dark" disabled={f.reason.trim().length < 3} loading={addClosure.isPending} onClick={submit} className="h-11">
          Programar
        </Button>
      </div>
      {closures.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No hay cierres programados" className="py-8" />
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium first-letter:uppercase">{longDate(c.closed_on)}</span>
                <span className="text-ink-soft">
                  {' '}
                  en {branchName(c.branch_id)}: {c.reason}
                </span>
              </span>
              <IconButton label="Quitar cierre" size="icon-sm" variant="danger-ghost" onClick={() => removeClosure.mutate(c.id)}>
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function Settings() {
  usePageTitle('Configuración');
  const { data, isPending, error, refetch } = useAdminSettings();
  const [tab, setTab] = useState('rules');

  return (
    <>
      <PageHeader title="Configuración" description="Reglas de reserva, sedes, horarios y cierres.">
        <div className="mt-5">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'rules', label: 'Reglas' },
              { value: 'branches', label: 'Sedes y horarios' },
              { value: 'closures', label: 'Cierres' },
            ]}
          />
        </div>
      </PageHeader>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <PageLoader />
      ) : tab === 'rules' ? (
        <RulesSection settings={data.settings} />
      ) : tab === 'branches' ? (
        <div className="space-y-5">
          {data.branches.map((b) => (
            <BranchSection key={b.id} branch={b} />
          ))}
        </div>
      ) : (
        <ClosuresSection closures={data.closures} branches={data.branches} />
      )}
    </>
  );
}
