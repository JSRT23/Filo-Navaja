import { useState } from 'react';
import { ClipboardPen, Fingerprint, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceLogs, useAttendanceReport, useManualAttendance, useStaffBarbers } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { dateTime, localToInstant, number, todayISO } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PageHeader, Panel, RangePicker, Table, Td, Th, rangeFor } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';

const hours = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h${m ? ` ${m} min` : ''}`;
};

function ManualModal({ open, onOpenChange, barbers }) {
  const save = useManualAttendance();
  const [barberId, setBarberId] = useState('');
  const [type, setType] = useState('check_in');
  const [date, setDate] = useState(todayISO());
  const [clockTime, setClockTime] = useState('');
  const [notes, setNotes] = useState('');
  const valid = barberId && clockTime && notes.trim().length >= 4;

  const submit = async () => {
    try {
      await save.mutateAsync({ barberId, type, recordedAt: localToInstant(date, clockTime), notes });
      toast.success('Marcación registrada');
      onOpenChange(false);
      setBarberId('');
      setClockTime('');
      setNotes('');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Corregir marcación"
      description="Para cuando un barbero olvidó marcar en el kiosco. Queda registrado quién la hizo."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={!valid} loading={save.isPending} onClick={submit}>
            Registrar marcación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Barbero">
          {(p) => (
            <Select {...p} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Elige un barbero</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Segmented
          size="sm"
          value={type}
          onChange={setType}
          options={[
            { value: 'check_in', label: 'Entrada' },
            { value: 'check_out', label: 'Salida' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            {(p) => <Input {...p} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Hora">{(p) => <Input {...p} type="time" value={clockTime} onChange={(e) => setClockTime(e.target.value)} />}</Field>
        </div>
        <Field label="Motivo">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: el kiosco estaba sin internet"
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

export default function Attendance() {
  const { role, barber, isFrontDesk, isAdmin } = useAuth();
  const { branchId } = usePanel();
  usePageTitle(role === 'barber' ? 'Mi asistencia' : 'Asistencia');
  const [preset, setPreset] = useState('fortnight');
  const range = rangeFor(preset);
  const report = useAttendanceReport({ ...range, branchId: isAdmin ? branchId : null });
  const logs = useAttendanceLogs({
    ...range,
    branchId: role === 'barber' ? null : branchId,
    barberId: role === 'barber' ? barber?.id : null,
  });
  const barbers = useStaffBarbers(branchId);
  const [manual, setManual] = useState(false);

  return (
    <>
      <PageHeader
        title={role === 'barber' ? 'Mi asistencia' : 'Asistencia'}
        description="Entradas y salidas marcadas en el kiosco de la sede con el PIN de cada barbero."
        actions={
          isFrontDesk && (
            <>
              <Button variant="outline" to="/kiosco">
                <Fingerprint className="size-4" aria-hidden /> Abrir kiosco
              </Button>
              <Button variant="dark" onClick={() => setManual(true)}>
                <ClipboardPen className="size-4" aria-hidden /> Corregir marcación
              </Button>
            </>
          )
        }
      >
        <div className="mt-5">
          <RangePicker value={preset} onChange={setPreset} />
        </div>
      </PageHeader>

      <Panel title="Resumen del periodo" padded={false}>
        {report.error ? (
          <ErrorState error={report.error} onRetry={report.refetch} />
        ) : report.isPending ? (
          <PageLoader />
        ) : !report.data?.length ? (
          <EmptyState title="Sin datos de asistencia" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Barbero</Th>
                <Th align="right">Días programados</Th>
                <Th align="right">Días trabajados</Th>
                <Th align="right">Ausencias</Th>
                <Th align="right">Llegadas tarde</Th>
                <Th align="right">Horas trabajadas</Th>
              </tr>
            </thead>
            <tbody>
              {report.data.map((r) => (
                <tr key={r.barber_id}>
                  <Td>
                    <p className="font-medium">{r.barber_name}</p>
                    <p className="text-xs text-ink-mute">{shortBranch(r.branch_name)}</p>
                  </Td>
                  <Td align="right">{number(r.scheduled_days)}</Td>
                  <Td align="right">{number(r.worked_days)}</Td>
                  <Td align="right" className={cn(r.absences > 0 && 'font-semibold text-pole-600')}>
                    {number(r.absences)}
                  </Td>
                  <Td align="right" className={cn(r.late_arrivals > 0 && 'font-semibold text-amber-600')}>
                    {number(r.late_arrivals)}
                  </Td>
                  <Td align="right">{hours(r.worked_minutes)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Marcaciones" className="mt-5" padded={false}>
        {logs.error ? (
          <ErrorState error={logs.error} onRetry={logs.refetch} />
        ) : logs.isPending ? (
          <PageLoader />
        ) : !logs.data?.length ? (
          <EmptyState icon={Fingerprint} title="No hay marcaciones en este periodo" />
        ) : (
          <ul className="divide-y divide-line">
            {logs.data.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full',
                    l.type === 'check_in' ? 'bg-sinu-50 text-sinu-600' : 'bg-paper text-ink-soft',
                  )}
                >
                  {l.type === 'check_in' ? <LogIn className="size-4" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{l.barber?.display_name}</span>
                  <span className="text-ink-soft"> {l.type === 'check_in' ? 'entró' : 'salió'}</span>
                  {l.notes && <span className="block truncate text-xs text-ink-mute">{l.notes}</span>}
                </span>
                {l.source === 'manual' && (
                  <Badge tone="amber">Corrección{l.author?.full_name ? ` de ${l.author.full_name.split(' ')[0]}` : ''}</Badge>
                )}
                <span className="tabular whitespace-nowrap text-ink-soft">{dateTime(l.recorded_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {isFrontDesk && <ManualModal open={manual} onOpenChange={setManual} barbers={barbers.data ?? []} />}
    </>
  );
}
