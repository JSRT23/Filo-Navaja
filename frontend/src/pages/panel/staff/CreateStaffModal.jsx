import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateStaff } from '@/api/admin';
import { groupByCategory, useServices } from '@/api/catalog';
import { errorMessage } from '@/lib/errors';
import { ROLE_LABEL } from '@/lib/constants';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Segmented, Select } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/Feedback';
import { shortBranch } from '@/components/site/Branches';

const COLORS = ['#C8A96A', '#8E7CC3', '#6FA8DC', '#93C47D', '#F6B26B', '#E06666', '#76A5AF', '#B4A7D6'];

function tempPassword() {
  const words = ['Navaja', 'Tijera', 'Brocha', 'Peine', 'Toalla', 'Patilla'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}${Math.floor(1000 + Math.random() * 9000)}!`;
}

const EMPTY = () => ({
  role: 'barber',
  full_name: '',
  email: '',
  phone: '',
  password: tempPassword(),
  branch_id: '',
  display_name: '',
  specialties: '',
  service_ids: [],
  calendar_color: COLORS[0],
  pin: '',
});

export function CreateStaffModal({ open, onOpenChange, branches }) {
  const { data: services = [] } = useServices();
  const create = useCreateStaff();
  const [f, setF] = useState(EMPTY);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      setF({ ...EMPTY(), branch_id: branches[0]?.id ?? '' });
      setCreated(null);
    }
  }, [open, branches]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const isBarber = f.role === 'barber';
  const valid =
    f.full_name.trim().length >= 3 &&
    /\S+@\S+\.\S+/.test(f.email) &&
    f.password.length >= 8 &&
    (f.role === 'admin' || f.branch_id) &&
    (!isBarber || !f.pin || /^\d{4,6}$/.test(f.pin));

  const submit = async () => {
    try {
      const body = {
        email: f.email.trim(),
        password: f.password,
        full_name: f.full_name.trim(),
        phone: f.phone.trim() || undefined,
        role: f.role,
        branch_id: f.role === 'admin' ? undefined : f.branch_id,
        barber: isBarber
          ? {
              display_name: f.display_name.trim() || f.full_name.trim().split(' ').slice(0, 2).join(' '),
              specialties: f.specialties
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              service_ids: f.service_ids,
              calendar_color: f.calendar_color,
              pin: f.pin || undefined,
            }
          : undefined,
      };
      await create.mutateAsync(body);
      setCreated({ email: body.email, password: f.password, role: f.role });
      toast.success(`${ROLE_LABEL[f.role]} creado`);
    } catch (e) {
      toast.error('No se pudo crear', { description: errorMessage(e) });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Agregar persona al equipo"
      description="Se crea su usuario con una contraseña temporal. Pídele que la cambie al ingresar."
      footer={
        created ? (
          <Button variant="dark" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="dark" disabled={!valid} loading={create.isPending} onClick={submit}>
              Crear usuario
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <InlineAlert tone="sinu">Usuario creado. Entrégale estos datos de forma privada.</InlineAlert>
          <dl className="rounded-md bg-paper p-4 text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-ink-soft">Correo</dt>
              <dd className="font-medium">{created.email}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-ink-soft">Contraseña temporal</dt>
              <dd className="font-mono font-medium">{created.password}</dd>
            </div>
          </dl>
          {created.role === 'barber' && (
            <p className="text-sm text-ink-soft">Ahora abre su ficha y configura el horario semanal para que reciba reservas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <Segmented
            value={f.role}
            onChange={(v) => set('role', v)}
            options={[
              { value: 'barber', label: 'Barbero' },
              { value: 'receptionist', label: 'Recepción' },
              { value: 'admin', label: 'Administración' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo">
              {(p) => <Input {...p} value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />}
            </Field>
            <Field label="Celular" optional>
              {(p) => <Input {...p} type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />}
            </Field>
            <Field label="Correo para ingresar">
              {(p) => <Input {...p} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />}
            </Field>
            <Field label="Contraseña temporal" hint="Mínimo 8 caracteres">
              {(p) => (
                <div className="flex gap-2">
                  <Input {...p} value={f.password} onChange={(e) => set('password', e.target.value)} className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Generar otra"
                    onClick={() => set('password', tempPassword())}
                    className="h-11 w-11"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              )}
            </Field>
            {f.role !== 'admin' && (
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
            )}
          </div>

          {isBarber && (
            <div className="space-y-4 border-t border-line pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre visible" hint="Como aparece en la web. Ej.: Carlos Díaz">
                  {(p) => (
                    <Input
                      {...p}
                      value={f.display_name}
                      onChange={(e) => set('display_name', e.target.value)}
                      placeholder={f.full_name.split(' ').slice(0, 2).join(' ')}
                    />
                  )}
                </Field>
                <Field label="PIN del kiosco" optional hint="4 a 6 dígitos. Evita 1234 o 1111.">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      maxLength={6}
                      value={f.pin}
                      onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))}
                    />
                  )}
                </Field>
                <Field label="Especialidades" hint="Separadas por coma" className="sm:col-span-2">
                  {(p) => (
                    <Input
                      {...p}
                      value={f.specialties}
                      onChange={(e) => set('specialties', e.target.value)}
                      placeholder="Fade, Barba, Freestyle"
                    />
                  )}
                </Field>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Color en la agenda</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color en la agenda">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={f.calendar_color === c}
                      aria-label={c}
                      onClick={() => set('calendar_color', c)}
                      className="size-8 rounded-full ring-2 ring-offset-2 transition-shadow"
                      style={{ background: c, '--tw-ring-color': f.calendar_color === c ? '#2b1416' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Servicios que presta <span className="font-normal text-ink-mute">(si no marcas ninguno, presta todos)</span>
                </p>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {groupByCategory(services)
                    .flatMap((g) => g.items)
                    .map((s) => (
                      <Checkbox
                        key={s.id}
                        checked={f.service_ids.includes(s.id)}
                        onChange={(e) =>
                          set('service_ids', e.target.checked ? [...f.service_ids, s.id] : f.service_ids.filter((x) => x !== s.id))
                        }
                        label={s.name}
                      />
                    ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-cordovan-700 hover:underline"
                  onClick={() =>
                    set(
                      'service_ids',
                      services.map((s) => s.id),
                    )
                  }
                >
                  Marcar todos
                </button>
              </div>
              <p className="text-sm text-ink-mute">El horario semanal y las comisiones se ajustan después desde su ficha.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
