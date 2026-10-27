import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useStaffProfiles, useUpdateProfile } from '@/api/admin';
import { useStaffBarbers } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { ROLE_LABEL, WEEKDAYS, WEEK_ORDER } from '@/lib/constants';

const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
import { cn } from '@/lib/cn';
import { PageHeader, Panel, Table, Td, Th } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Segmented, Switch } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { BarberEditor } from './BarberEditor';
import { CreateStaffModal } from './CreateStaffModal';

function WeekDots({ schedules = [] }) {
  return (
    <span className="flex gap-1" aria-label="Días que trabaja">
      {WEEK_ORDER.map((d) => {
        const on = schedules.some((s) => s.weekday === d);
        return (
          <span
            key={d}
            title={`${WEEKDAYS[d]}: ${on ? 'trabaja' : 'descansa'}`}
            className={cn(
              'grid size-6 place-items-center rounded-xs text-[0.65rem] font-semibold',
              on ? 'bg-onyx-900 text-bone-50' : 'bg-paper text-ink-mute',
            )}
          >
            {DAY_LETTER[d]}
          </span>
        );
      })}
    </span>
  );
}

export default function Staff() {
  usePageTitle('Personal');
  const { user } = useAuth();
  const { branches } = usePanel();
  const [tab, setTab] = useState('barbers');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const barbers = useStaffBarbers(null, { includeInactive: true });
  const profiles = useStaffProfiles();
  const updateProfile = useUpdateProfile();
  const branchById = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);
  const current = editing ? barbers.data?.find((b) => b.id === editing) : null;

  return (
    <>
      <PageHeader
        title="Personal"
        description="Barberos, recepción y administración de las dos sedes."
        actions={
          <Button variant="dark" onClick={() => setCreating(true)}>
            <UserPlus className="size-4" aria-hidden /> Agregar persona
          </Button>
        }
      >
        <div className="mt-5">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'barbers', label: `Barberos (${barbers.data?.length ?? 0})` },
              { value: 'others', label: 'Recepción y administración' },
            ]}
          />
        </div>
      </PageHeader>

      {tab === 'barbers' ? (
        barbers.error ? (
          <ErrorState error={barbers.error} onRetry={barbers.refetch} />
        ) : barbers.isPending ? (
          <PageLoader />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {barbers.data.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setEditing(b.id)}
                className={cn(
                  'flex flex-col rounded-lg bg-white p-5 text-left shadow-card ring-1 ring-line transition-shadow hover:ring-line-strong',
                  !b.is_active && 'opacity-60',
                )}
              >
                <span className="flex items-center gap-3">
                  <Avatar name={b.display_name} src={b.photo} size="md" color={b.calendar_color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.display_name}</span>
                    <span className="block truncate text-sm text-ink-mute">{shortBranch(branchById[b.branch_id]?.name)}</span>
                  </span>
                  {!b.is_active ? (
                    <Badge tone="steel">Inactivo</Badge>
                  ) : !b.accepts_online_booking ? (
                    <Badge tone="amber">Sin reservas en línea</Badge>
                  ) : null}
                </span>
                <span className="mt-4 flex flex-wrap gap-1.5">
                  {b.specialties?.map((s) => (
                    <span key={s} className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft ring-1 ring-line">
                      {s}
                    </span>
                  ))}
                </span>
                <span className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                  <WeekDots schedules={b.barber_schedules} />
                  <span className="tabular text-ink-soft">{Number(b.compensation?.service_commission_rate ?? 0)} % servicios</span>
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        <Panel padded={false}>
          {profiles.isPending ? (
            <PageLoader />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Persona</Th>
                  <Th>Rol</Th>
                  <Th>Sede</Th>
                  <Th>Acceso</Th>
                </tr>
              </thead>
              <tbody>
                {(profiles.data ?? [])
                  .filter((p) => p.role !== 'barber')
                  .map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <span className="flex items-center gap-3">
                          <Avatar name={p.full_name} size="sm" />
                          <span>
                            <span className="block font-medium">{p.full_name}</span>
                            <span className="block text-xs text-ink-mute">{p.email}</span>
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={p.role === 'admin' ? 'cordovan' : 'neutral'}>{ROLE_LABEL[p.role]}</Badge>
                      </Td>
                      <Td className="text-ink-soft">{p.branch_id ? shortBranch(branchById[p.branch_id]?.name) : 'Todas'}</Td>
                      <Td>
                        <Switch
                          checked={p.is_active}
                          disabled={p.id === user?.id}
                          label={<span className="sr-only">Acceso activo</span>}
                          onChange={async (v) => {
                            try {
                              await updateProfile.mutateAsync({ id: p.id, is_active: v });
                              toast.success(v ? 'Acceso activado' : 'Acceso desactivado');
                            } catch (e) {
                              toast.error(errorMessage(e));
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}

      <BarberEditor barber={current} branches={branches} onClose={() => setEditing(null)} />
      <CreateStaffModal open={creating} onOpenChange={setCreating} branches={branches} />
    </>
  );
}
