import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useCommissionActions, useCommissionPeriods, useCommissionSummary } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { addDays, endOfMonth, money, number, shortDate, startOfMonth, todayISO } from '@/lib/format';
import { PageHeader, Panel, StatTile, Table, Td, Th } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Field';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';

function fortnightOf(iso) {
  const day = Number(iso.slice(8));
  return day <= 15 ? { from: startOfMonth(iso), to: `${iso.slice(0, 8)}15` } : { from: `${iso.slice(0, 8)}16`, to: endOfMonth(iso) };
}

const label = (r) => `${shortDate(r.from)} al ${shortDate(r.to)}`;

export default function Commissions() {
  const { role, isAdmin } = useAuth();
  usePageTitle(role === 'barber' ? 'Mis comisiones' : 'Comisiones');
  const current = fortnightOf(todayISO());
  const previous = fortnightOf(addDays(current.from, -1));
  const [which, setWhich] = useState('current');
  const range = which === 'current' ? current : previous;
  const summary = useCommissionSummary(range);
  const periods = useCommissionPeriods();
  const { close, markPaid } = useCommissionActions();
  const [confirmClose, setConfirmClose] = useState(false);
  const [paying, setPaying] = useState(null);

  const rows = useMemo(() => summary.data ?? [], [summary.data]);
  const totals = rows.reduce(
    (t, r) => ({
      services: t.services + r.services_count,
      servicesRevenue: t.servicesRevenue + Number(r.services_revenue),
      products: t.products + r.products_count,
      productsRevenue: t.productsRevenue + Number(r.products_revenue),
      commission: t.commission + Number(r.total_commission),
    }),
    { services: 0, servicesRevenue: 0, products: 0, productsRevenue: 0, commission: 0 },
  );
  const alreadyClosed = (periods.data ?? []).some((p) => p.starts_on === previous.from && p.ends_on === previous.to);

  return (
    <>
      <PageHeader
        title={role === 'barber' ? 'Mis comisiones' : 'Comisiones'}
        description="Se calculan sobre ventas cobradas y se liquidan por quincena: del 1 al 15 y del 16 al fin de mes."
        actions={
          isAdmin &&
          !alreadyClosed && (
            <Button variant="dark" onClick={() => setConfirmClose(true)}>
              <Lock className="size-4" aria-hidden /> Cerrar quincena anterior
            </Button>
          )
        }
      >
        <div className="mt-5">
          <Segmented
            size="sm"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'current', label: `Quincena actual (${label(current)})` },
              { value: 'previous', label: `Anterior (${label(previous)})` },
            ]}
          />
        </div>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <StatTile
            tone="dark"
            icon={Wallet}
            label={role === 'barber' ? 'Tu comisión' : 'Total a pagar'}
            value={money(totals.commission)}
            loading={summary.isPending}
            hint={which === 'current' ? 'Acumulado hasta hoy' : 'Quincena terminada'}
          />
        </div>
        <StatTile label="Servicios" value={number(totals.services)} loading={summary.isPending} hint={money(totals.servicesRevenue)} />
        <StatTile
          label="Productos vendidos"
          value={number(totals.products)}
          loading={summary.isPending}
          hint={money(totals.productsRevenue)}
        />
        <StatTile
          label="Ventas que comisionan"
          value={money(totals.servicesRevenue + totals.productsRevenue)}
          loading={summary.isPending}
        />
      </div>

      <Panel title="Detalle por barbero" padded={false}>
        {summary.error ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : summary.isPending ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin ventas en esta quincena" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Barbero</Th>
                <Th align="right">Servicios</Th>
                <Th align="right">Venta servicios</Th>
                <Th align="right">Productos</Th>
                <Th align="right">Venta productos</Th>
                <Th align="right">Comisión servicios</Th>
                <Th align="right">Comisión productos</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.barber_id}>
                  <Td>
                    <p className="font-medium">{r.barber_name}</p>
                    <p className="text-xs text-ink-mute">{shortBranch(r.branch_name)}</p>
                  </Td>
                  <Td align="right">{number(r.services_count)}</Td>
                  <Td align="right">{money(r.services_revenue)}</Td>
                  <Td align="right">{number(r.products_count)}</Td>
                  <Td align="right">{money(r.products_revenue)}</Td>
                  <Td align="right">{money(r.service_commission)}</Td>
                  <Td align="right">{money(r.product_commission)}</Td>
                  <Td align="right" className="font-bold">
                    {money(r.total_commission)}
                  </Td>
                </tr>
              ))}
            </tbody>
            {rows.length > 1 && (
              <tfoot>
                <tr className="bg-paper/70 font-semibold">
                  <Td>Total</Td>
                  <Td align="right">{number(totals.services)}</Td>
                  <Td align="right">{money(totals.servicesRevenue)}</Td>
                  <Td align="right">{number(totals.products)}</Td>
                  <Td align="right">{money(totals.productsRevenue)}</Td>
                  <Td align="right" />
                  <Td align="right" />
                  <Td align="right">{money(totals.commission)}</Td>
                </tr>
              </tfoot>
            )}
          </Table>
        )}
      </Panel>

      <Panel title="Quincenas cerradas" className="mt-5" padded={false}>
        {periods.isPending ? (
          <PageLoader />
        ) : !periods.data?.length ? (
          <EmptyState title="Aún no se ha cerrado ninguna quincena" />
        ) : (
          <ul className="divide-y divide-line">
            {periods.data.map((p) => {
              const total = (p.statements ?? []).reduce((s, x) => s + Number(x.total_commission), 0);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {shortDate(p.starts_on)} al {shortDate(p.ends_on)}
                    </p>
                    <p className="text-sm text-ink-mute">
                      {(p.statements ?? []).length} {role === 'barber' ? 'estado de cuenta' : 'barberos'}, cerrada el{' '}
                      {shortDate(p.closed_at)}
                    </p>
                  </div>
                  <span className="tabular font-semibold">{money(total)}</span>
                  {p.status === 'paid' ? (
                    <Badge tone="sinu">
                      <CheckCircle2 className="size-3" aria-hidden /> Pagada {p.paid_at ? shortDate(p.paid_at) : ''}
                    </Badge>
                  ) : (
                    <Badge tone="amber">Por pagar</Badge>
                  )}
                  {isAdmin && p.status !== 'paid' && (
                    <Button size="sm" variant="outline" onClick={() => setPaying(p)}>
                      Marcar como pagada
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        tone="dark"
        title={`Cerrar quincena ${label(previous)}`}
        confirmLabel="Cerrar quincena"
        loading={close.isPending}
        onConfirm={async () => {
          try {
            await close.mutateAsync(previous);
            toast.success('Quincena cerrada', { description: 'Los estados de cuenta quedaron congelados.' });
            setConfirmClose(false);
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Se congela lo que ganó cada barbero en ese periodo. Después de cerrar, las ventas de esas fechas ya no se pueden anular.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(paying)}
        onOpenChange={(o) => !o && setPaying(null)}
        tone="dark"
        title="Marcar quincena como pagada"
        confirmLabel="Ya se pagó"
        loading={markPaid.isPending}
        onConfirm={async () => {
          try {
            await markPaid.mutateAsync(paying.id);
            toast.success('Quincena marcada como pagada');
            setPaying(null);
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Confirma que ya se les pagó a los barberos la quincena del {paying && shortDate(paying.starts_on)} al{' '}
        {paying && shortDate(paying.ends_on)}.
      </ConfirmDialog>
    </>
  );
}
