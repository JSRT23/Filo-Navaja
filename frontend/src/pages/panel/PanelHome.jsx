import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpRight, CalendarCheck, Receipt, UserX, Wallet, Wifi } from 'lucide-react';
import { useDashboard, useLowStock, useAgenda } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PAYMENT } from '@/lib/constants';
import { dayMonth, firstName, money, number, percent, time, todayISO } from '@/lib/format';
import { BarList, PageHeader, Panel, RangePicker, StatTile, rangeFor } from '@/components/panel/PanelUI';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorState, EmptyState } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { shortBranch } from '@/components/site/Branches';

const compactMoney = new Intl.NumberFormat('es-CO', { notation: 'compact', style: 'currency', currency: 'COP', maximumFractionDigits: 1 });

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }).format(new Date()));
  return h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md bg-cordovan-950 px-3 py-2 text-sm text-bone-50 shadow-pop">
      <p className="text-bone-100/70">{dayMonth(p.day)}</p>
      <p className="tabular font-semibold">{money(p.revenue)}</p>
      <p className="text-xs text-bone-100/60">{p.sales} ventas</p>
    </div>
  );
}

function RevenueChart({ data }) {
  if (!data.length) return <EmptyState title="Sin ventas en este periodo" className="py-16" />;
  return (
    <div className="h-72" role="img" aria-label="Ingresos por día">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#ece7df" />
          <XAxis
            dataKey="day"
            tickFormatter={(d) => dayMonth(d)}
            tickLine={false}
            axisLine={{ stroke: '#d5ccbf' }}
            tick={{ fontSize: 12, fill: '#71665e' }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(v) => compactMoney.format(v).replace(/\u00a0/g, ' ')}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#71665e' }}
            width={72}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(43,20,22,0.05)' }} />
          <Bar dataKey="revenue" fill="var(--color-chart)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MixBar({ services, products }) {
  const total = services + products;
  if (!total) return null;
  const sPct = (services / total) * 100;
  return (
    <div>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`Servicios ${percent(sPct, 0)}, productos ${percent(100 - sPct, 0)}`}
      >
        <div className="h-full rounded-l-full bg-chart" style={{ width: `${sPct}%` }} />
        <div className="h-full rounded-r-full bg-chart-2" style={{ width: `${100 - sPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-chart" aria-hidden /> Servicios{' '}
          <span className="tabular font-semibold">{money(services)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-chart-2" aria-hidden /> Productos{' '}
          <span className="tabular font-semibold">{money(products)}</span>
        </span>
      </div>
    </div>
  );
}

function TodayList({ branchId }) {
  const { data = [], isPending } = useAgenda({ branchId, date: todayISO() });
  const now = Date.now();
  const upcoming = data.filter((a) => !['cancelled', 'no_show', 'completed'].includes(a.status) && new Date(a.ends_at) > now).slice(0, 6);
  return (
    <Panel
      title="Lo que sigue hoy"
      padded={false}
      actions={
        <Link to="/panel/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-cordovan-700 hover:underline">
          Agenda <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {isPending ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10 rounded-sm" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No hay más citas por atender hoy" className="py-10" />
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <span className="tabular w-[4.5rem] shrink-0 text-sm font-semibold">{time(a.starts_at)}</span>
              <Avatar name={a.barber_name} size="xs" color={a.calendar_color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.customer_name}</p>
                <p className="truncate text-xs text-ink-mute">
                  {a.service_name}, con {firstName(a.barber_name)}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function PanelHome() {
  usePageTitle('Resumen');
  const { role, profile, isAdmin } = useAuth();
  const { branchId, branches } = usePanel();
  const [preset, setPreset] = useState('month');
  const [scope, setScope] = useState('all');
  const range = rangeFor(preset);
  const branchFilter = isAdmin ? (scope === 'all' ? null : scope) : branchId;
  const { data, isPending, error, refetch } = useDashboard({ ...range, branchId: branchFilter });
  const lowStock = useLowStock(branchFilter);

  const daily = useMemo(() => (data?.daily_revenue ?? []).map((d) => ({ ...d, revenue: Number(d.revenue) })), [data]);

  if (role === 'barber') return <Navigate to="/panel/agenda" replace />;

  const rev = data?.revenue;
  const ap = data?.appointments;

  return (
    <>
      <PageHeader title={`${greeting()}, ${firstName(profile?.full_name)}`} description="Así va la barbería en el periodo elegido.">
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <RangePicker value={preset} onChange={setPreset} />
          {isAdmin && (
            <Segmented
              size="sm"
              aria-label="Sede"
              value={scope}
              onChange={setScope}
              options={[{ value: 'all', label: 'Todas las sedes' }, ...branches.map((b) => ({ value: b.id, label: shortBranch(b.name) }))]}
            />
          )}
        </div>
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <StatTile
                tone="dark"
                label="Ingresos"
                icon={Wallet}
                loading={isPending}
                value={money(rev?.total)}
                hint={rev?.discounts > 0 ? `${money(rev.discounts)} en descuentos` : 'Sin descuentos'}
              />
            </div>
            <StatTile
              label="Ventas"
              icon={Receipt}
              loading={isPending}
              value={number(rev?.sales_count)}
              hint={`Ticket promedio ${money(rev?.average_ticket)}`}
            />
            <StatTile
              label="Citas atendidas"
              icon={CalendarCheck}
              loading={isPending}
              value={number(ap?.completed)}
              hint={`De ${number(ap?.total)} agendadas, ${number(ap?.upcoming)} por venir`}
            />
            <StatTile
              label="No asistieron"
              icon={UserX}
              loading={isPending}
              value={percent(ap?.no_show_rate)}
              hint={`${number(ap?.no_show)} citas perdidas`}
            />
            <StatTile
              label="Reservas en línea"
              icon={Wifi}
              loading={isPending}
              value={percent(ap?.online_share)}
              hint="Del total de citas activas"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Panel title="Ingresos por día" description="Ventas cobradas, sin anuladas">
              {isPending ? <div className="skeleton h-72 rounded-md" /> : <RevenueChart data={daily} />}
              {!isPending && rev && (
                <div className="mt-5 border-t border-line pt-4">
                  <MixBar services={Number(rev.services)} products={Number(rev.products)} />
                </div>
              )}
            </Panel>
            <Panel title="Medios de pago">
              <BarList
                valueFormat={money}
                rows={Object.entries(rev?.by_payment_method ?? {})
                  .map(([k, v]) => ({ label: PAYMENT[k] ?? k, value: Number(v) }))
                  .sort((a, b) => b.value - a.value)}
              />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Servicios más vendidos">
              <BarList
                valueFormat={(v) => `${number(v)}`}
                rows={(data?.top_services ?? []).map((s) => ({ label: s.name, value: s.count, sub: money(s.revenue) }))}
              />
            </Panel>
            <Panel title="Barberos por ingresos">
              <BarList
                valueFormat={money}
                rows={(data?.top_barbers ?? []).map((b) => ({
                  label: b.name,
                  value: Number(b.revenue),
                  sub: `${number(b.services)} servicios`,
                }))}
              />
            </Panel>
            <Panel title="Productos más vendidos">
              <BarList
                valueFormat={(v) => `${number(v)} und.`}
                rows={(data?.top_products ?? []).map((p) => ({ label: p.name, value: p.count, sub: money(p.revenue) }))}
              />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <TodayList branchId={branchFilter ?? branchId} />
            <Panel
              title="Inventario por reponer"
              padded={false}
              actions={
                <Link
                  to="/panel/inventario"
                  className="inline-flex items-center gap-1 text-sm font-medium text-cordovan-700 hover:underline"
                >
                  Inventario <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              }
            >
              {lowStock.data?.length ? (
                <ul className="divide-y divide-line">
                  {lowStock.data.slice(0, 6).map((p) => (
                    <li key={`${p.product_id}-${p.branch_id}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {p.name} <span className="text-ink-mute">en {shortBranch(p.branch_name)}</span>
                      </span>
                      <span className="tabular shrink-0 font-semibold">
                        {p.quantity} de {p.min_stock}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Todo el inventario está sobre el mínimo" className="py-10" />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
