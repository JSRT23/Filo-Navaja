import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Banknote, CreditCard, Landmark, Minus, Plus, Search, Smartphone, Trash2, Wallet, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useServices } from '@/api/catalog';
import { useCreateSale, usePendingCheckout, useSales, useStaffBarbers, useStock, useVoidSale } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { CustomerPicker } from '@/features/customers/CustomerPicker';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { PAYMENT } from '@/lib/constants';
import { firstName, money, time, todayISO } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PageHeader, Panel } from '@/components/panel/PanelUI';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ReceiptModal } from './Receipt';

const PAY_ICONS = { cash: Banknote, card: CreditCard, transfer: Landmark, nequi: Smartphone, daviplata: Wallet };

let lineSeq = 0;
const newLine = (item) => ({ key: ++lineSeq, quantity: 1, ...item });

function Catalog({ services, products, onAdd }) {
  const [tab, setTab] = useState('services');
  const [term, setTerm] = useState('');
  const list = (tab === 'services' ? services : products).filter((x) => x.name.toLowerCase().includes(term.trim().toLowerCase()));
  return (
    <Panel
      title="Agregar a la cuenta"
      actions={
        <Segmented
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'services', label: 'Servicios' },
            { value: 'products', label: 'Productos' },
          ]}
        />
      }
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" aria-hidden />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar…"
          className="pl-9"
          aria-label="Buscar en el catálogo"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((x) => {
          const out = tab === 'products' && x.quantity <= 0;
          return (
            <button
              key={x.id}
              type="button"
              disabled={out}
              onClick={() =>
                onAdd(
                  tab === 'services'
                    ? { type: 'service', id: x.id, description: x.name, unit_price: x.price }
                    : { type: 'product', id: x.id, description: x.name, unit_price: x.price, stock: x.quantity },
                )
              }
              className="flex min-h-20 flex-col justify-between rounded-md bg-paper p-3 text-left ring-1 ring-line transition-colors hover:bg-white hover:ring-cordovan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm font-medium leading-snug">{x.name}</span>
              <span className="mt-2 flex items-end justify-between gap-2">
                <span className="tabular text-sm font-semibold">{money(x.price)}</span>
                {tab === 'products' && (
                  <span className={cn('text-xs', x.low ? 'text-amber-600' : 'text-ink-mute')}>
                    {out ? 'Agotado' : `${x.quantity} und.`}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function PendingStrip({ pending, onPick, activeId }) {
  if (!pending.length) return null;
  return (
    <Panel title="Por cobrar hoy" description="Citas del día que aún no tienen venta" padded={false}>
      <div className="flex gap-2 overflow-x-auto p-4 scrollbar-none">
        {pending.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a)}
            className={cn(
              'w-52 shrink-0 rounded-md p-3 text-left ring-1 transition-colors',
              activeId === a.id ? 'bg-cordovan-900 text-bone-50 ring-cordovan-900' : 'bg-paper ring-line hover:ring-cordovan-600',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="tabular text-sm font-semibold">{time(a.starts_at)}</span>
              {activeId !== a.id && <StatusBadge status={a.status} />}
            </span>
            <span className="mt-1 block truncate text-sm font-medium">{a.customer_name}</span>
            <span className={cn('block truncate text-xs', activeId === a.id ? 'text-bone-100/70' : 'text-ink-mute')}>
              {a.service_name}, {firstName(a.barber_name)}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function SalesToday({ branchId, date }) {
  const { isAdmin } = useAuth();
  const sales = useSales(branchId, date);
  const voidSale = useVoidSale();
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');
  const completed = (sales.data ?? []).filter((s) => s.status === 'completed');
  const total = completed.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <Panel title="Ventas de hoy" description={`${completed.length} ventas por ${money(total)}`} padded={false}>
      {sales.error ? (
        <ErrorState error={sales.error} onRetry={sales.refetch} />
      ) : !sales.data?.length ? (
        <EmptyState title="Todavía no hay ventas hoy" className="py-10" />
      ) : (
        <ul className="divide-y divide-line">
          {sales.data.map((s) => (
            <li key={s.id} className={cn('flex items-center gap-3 px-5 py-3 text-sm', s.status === 'voided' && 'opacity-60')}>
              <span className="tabular w-12 shrink-0 font-semibold text-ink-mute">#{s.number}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.customer?.full_name ?? 'Consumidor final'}</p>
                <p className="truncate text-xs text-ink-mute">
                  {time(s.created_at)}, {s.items.map((i) => i.description).join(', ')}
                </p>
              </div>
              <span className="hidden text-ink-soft sm:block">{PAYMENT[s.payment_method]}</span>
              {s.status === 'voided' ? (
                <Badge tone="pole">Anulada</Badge>
              ) : (
                <span className="tabular w-24 text-right font-semibold">{money(s.total)}</span>
              )}
              {isAdmin && s.status === 'completed' && (
                <IconButton label={`Anular venta ${s.number}`} size="icon-sm" onClick={() => setVoiding(s)}>
                  <Ban className="size-4" />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={Boolean(voiding)}
        onOpenChange={(o) => {
          if (!o) {
            setVoiding(null);
            setReason('');
          }
        }}
        size="sm"
        title={`Anular venta #${voiding?.number ?? ''}`}
        description="Los productos vuelven al inventario y la venta deja de contar en comisiones."
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoiding(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 4}
              loading={voidSale.isPending}
              onClick={async () => {
                try {
                  await voidSale.mutateAsync({ id: voiding.id, reason });
                  toast.success(`Venta #${voiding.number} anulada`);
                  setVoiding(null);
                  setReason('');
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            >
              Anular venta
            </Button>
          </>
        }
      >
        <Field label="Motivo">
          {(p) => (
            <Textarea {...p} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: se cobró dos veces" />
          )}
        </Field>
      </Modal>
    </Panel>
  );
}

export default function Checkout() {
  usePageTitle('Caja');
  const { isAdmin } = useAuth();
  const { branchId, branch } = usePanel();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const services = useServices();
  const stock = useStock(branchId);
  const barbers = useStaffBarbers(branchId);
  const pending = usePendingCheckout(branchId, today);
  const createSale = useCreateSale();

  const [lines, setLines] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('cash');
  const [received, setReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);

  const barberList = barbers.data ?? [];
  const barberName = (id) => barberList.find((b) => b.id === id)?.display_name;

  const reset = () => {
    setLines([]);
    setCustomer(null);
    setAppointment(null);
    setDiscount('');
    setPayment('cash');
    setReceived('');
    setNotes('');
  };

  const loadAppointment = useCallback((a) => {
    setAppointment(a);
    setCustomer({ id: a.customer_id, full_name: a.customer_name, phone: a.customer_phone, email: a.customer_email });
    setLines([
      newLine({
        type: 'service',
        id: a.service_id,
        description: a.service_name,
        unit_price: Number(a.price),
        barber_id: a.barber_id,
        locked: true,
      }),
    ]);
  }, []);

  // ?cita=<id> desde la agenda
  const citaParam = params.get('cita');
  useEffect(() => {
    if (!citaParam || !pending.data) return;
    const a = pending.data.find((x) => x.id === citaParam);
    if (a) loadAppointment(a);
    else toast.info('Esa cita ya fue cobrada o no es de hoy');
    setParams({}, { replace: true });
  }, [citaParam, pending.data, setParams, loadAppointment]);

  const add = (item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.type === item.type && l.id === item.id && !l.locked);
      if (existing && item.type === 'product') {
        return prev.map((l) => (l.key === existing.key ? { ...l, quantity: Math.min(l.quantity + 1, item.stock ?? 99) } : l));
      }
      const defaultBarber = item.type === 'service' ? (appointment?.barber_id ?? '') : '';
      return [...prev, newLine({ ...item, barber_id: defaultBarber })];
    });
  };
  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - discountValue;
  const change = payment === 'cash' && Number(received) > total ? Number(received) - total : 0;
  const missingBarber = lines.some((l) => l.type === 'service' && !l.barber_id);

  const productsList = useMemo(() => (stock.data ?? []).filter((p) => p.is_active), [stock.data]);

  const charge = async () => {
    try {
      const result = await createSale.mutateAsync({
        branchId,
        paymentMethod: payment,
        items: lines.map((l) =>
          l.type === 'service'
            ? { type: 'service', service_id: l.id, barber_id: l.barber_id, quantity: l.quantity }
            : { type: 'product', product_id: l.id, quantity: l.quantity, ...(l.barber_id ? { barber_id: l.barber_id } : {}) },
        ),
        customerId: customer?.id ?? null,
        appointmentId: appointment?.id ?? null,
        discount: discountValue,
        notes,
      });
      setReceipt({
        number: result.number,
        date: new Date().toISOString(),
        customer: customer?.full_name,
        items: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          barber: l.barber_id ? firstName(barberName(l.barber_id)) : null,
        })),
        subtotal: result.subtotal,
        discount: result.discount,
        total: result.total,
        payment,
        received: payment === 'cash' ? Number(received) || null : null,
        change,
      });
      toast.success(`Venta #${result.number} por ${money(result.total)}`);
      reset();
    } catch (e) {
      toast.error('No se pudo cobrar', { description: errorMessage(e) });
    }
  };

  const loadError = services.error || stock.error || barbers.error;

  return (
    <>
      <PageHeader title="Caja" description="Cobra servicios y productos. Las comisiones y el inventario se actualizan solos." />
      {loadError ? (
        <ErrorState error={loadError} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_26rem]">
          <div className="min-w-0 space-y-5">
            <PendingStrip pending={pending.data ?? []} onPick={loadAppointment} activeId={appointment?.id} />
            <Catalog services={services.data ?? []} products={productsList} onAdd={add} />
            <SalesToday branchId={branchId} date={today} />
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section className="overflow-hidden rounded-lg bg-white shadow-ticket ring-1 ring-line">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="font-semibold">Cuenta</h2>
                {lines.length > 0 && (
                  <button type="button" onClick={reset} className="text-sm text-ink-soft hover:text-pole-600">
                    Vaciar
                  </button>
                )}
              </div>
              <div className="space-y-5 p-5">
                <Field label="Cliente">{() => <CustomerPicker value={customer} onChange={setCustomer} allowEmpty />}</Field>
                {appointment && (
                  <InlineAlert tone="sinu">
                    Cobrando la cita de las {time(appointment.starts_at)}. Al cobrar queda como atendida.
                  </InlineAlert>
                )}

                {lines.length === 0 ? (
                  <p className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-mute">
                    Agrega servicios o productos, o elige una cita por cobrar.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    <AnimatePresence initial={false}>
                      {lines.map((l) => (
                        <motion.li
                          key={l.key}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{l.description}</p>
                              <p className="tabular text-xs text-ink-mute">{money(l.unit_price)} c/u</p>
                            </div>
                            <span className="tabular text-sm font-semibold">{money(l.unit_price * l.quantity)}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Select
                              value={l.barber_id ?? ''}
                              onChange={(e) => updateLine(l.key, { barber_id: e.target.value })}
                              disabled={l.locked}
                              className={cn('h-9 text-sm', l.type === 'service' && !l.barber_id && 'border-amber-600')}
                              aria-label={l.type === 'service' ? 'Barbero que prestó el servicio' : 'Barbero que vendió el producto'}
                            >
                              <option value="">{l.type === 'service' ? '¿Quién lo hizo?' : 'Sin comisión'}</option>
                              {barberList.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.display_name}
                                </option>
                              ))}
                            </Select>
                            {l.type === 'product' && (
                              <div className="flex items-center rounded-sm ring-1 ring-line-strong">
                                <IconButton
                                  label="Quitar uno"
                                  size="icon-sm"
                                  onClick={() => (l.quantity > 1 ? updateLine(l.key, { quantity: l.quantity - 1 }) : removeLine(l.key))}
                                >
                                  <Minus className="size-3.5" />
                                </IconButton>
                                <span className="tabular w-6 text-center text-sm font-semibold">{l.quantity}</span>
                                <IconButton
                                  label="Agregar uno"
                                  size="icon-sm"
                                  disabled={l.quantity >= (l.stock ?? 99)}
                                  onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}
                                >
                                  <Plus className="size-3.5" />
                                </IconButton>
                              </div>
                            )}
                            {!l.locked && (
                              <IconButton
                                label="Quitar de la cuenta"
                                size="icon-sm"
                                variant="danger-ghost"
                                onClick={() => removeLine(l.key)}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Descuento" hint={isAdmin ? null : 'Máximo 20 %'}>
                    {(p) => (
                      <Input
                        {...p}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1000}
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                      />
                    )}
                  </Field>
                  {payment === 'cash' && (
                    <Field label="Recibido">
                      {(p) => (
                        <Input
                          {...p}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1000}
                          value={received}
                          onChange={(e) => setReceived(e.target.value)}
                          placeholder={String(total || '')}
                        />
                      )}
                    </Field>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Medio de pago</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3" role="radiogroup" aria-label="Medio de pago">
                    {Object.entries(PAYMENT).map(([k, label]) => {
                      const Icon = PAY_ICONS[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={payment === k}
                          onClick={() => setPayment(k)}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs font-medium ring-1 transition-colors',
                            payment === k
                              ? 'bg-cordovan-900 text-bone-50 ring-cordovan-900'
                              : 'bg-white text-ink-soft ring-line hover:ring-line-strong',
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Nota" optional>
                  {(p) => <Input {...p} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: pagó con QR de Nequi" />}
                </Field>
              </div>

              <div className="border-t border-line bg-paper/70 px-5 py-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">Subtotal</dt>
                    <dd className="tabular">{money(subtotal)}</dd>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Descuento</dt>
                      <dd className="tabular">-{money(discountValue)}</dd>
                    </div>
                  )}
                  {change > 0 && (
                    <div className="flex justify-between text-sinu-600">
                      <dt>Cambio</dt>
                      <dd className="tabular font-semibold">{money(change)}</dd>
                    </div>
                  )}
                </dl>
                <Button
                  size="lg"
                  className="mt-4 w-full justify-between"
                  disabled={!lines.length || missingBarber}
                  loading={createSale.isPending}
                  onClick={charge}
                >
                  <span>Cobrar</span>
                  <span className="tabular">{money(total)}</span>
                </Button>
                {missingBarber && <p className="mt-2 text-center text-xs text-amber-600">Indica qué barbero hizo cada servicio.</p>}
              </div>
            </section>
          </aside>
        </div>
      )}
      <ReceiptModal receipt={receipt} open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)} branch={branch} />
    </>
  );
}
