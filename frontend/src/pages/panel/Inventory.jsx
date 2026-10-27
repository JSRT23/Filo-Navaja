import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ClipboardCheck, History, MoreHorizontal, PackageMinus, PackagePlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryAction, useMovements, useStock } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePanel } from '@/features/panel/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { MOVEMENT_LABEL } from '@/lib/constants';
import { dateTime, money, number } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PageHeader, Panel, StatTile, Table, Td, Th } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/Menu';
import { Modal } from '@/components/ui/Modal';

const KINDS = {
  entry: { title: 'Entrada de mercancía', button: 'Registrar entrada', qtyLabel: 'Unidades que llegan' },
  adjust: { title: 'Ajuste por conteo', button: 'Guardar conteo', qtyLabel: 'Unidades contadas en la vitrina' },
  waste: { title: 'Merma o daño', button: 'Registrar merma', qtyLabel: 'Unidades dañadas o vencidas' },
  transfer: { title: 'Trasladar a otra sede', button: 'Trasladar', qtyLabel: 'Unidades a trasladar' },
};

function ActionModal({ action, onClose, products, branchId, branches }) {
  const run = useInventoryAction();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [toBranch, setToBranch] = useState('');

  useEffect(() => {
    if (!action) return;
    setProductId(action.product?.id ?? '');
    setQuantity(action.kind === 'adjust' && action.product ? String(action.product.quantity) : '');
    setUnitCost(action.product && action.kind === 'entry' ? String(action.product.cost || '') : '');
    setNotes('');
    setToBranch(branches.find((b) => b.id !== branchId)?.id ?? '');
  }, [action, branches, branchId]);

  if (!action) return null;
  const k = KINDS[action.kind];
  const product = products.find((p) => p.id === productId);
  const qty = Number(quantity);
  const needsNotes = action.kind === 'adjust' || action.kind === 'waste';
  const valid =
    productId && Number.isInteger(qty) && (action.kind === 'adjust' ? qty >= 0 : qty > 0) && (!needsNotes || notes.trim().length >= 3);

  const submit = async () => {
    try {
      await run.mutateAsync({
        kind: action.kind,
        productId,
        branchId,
        toBranchId: toBranch,
        quantity: qty,
        unitCost: unitCost ? Number(unitCost) : null,
        notes,
      });
      toast.success(`${k.title} registrada`, { description: product?.name });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={k.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={!valid} loading={run.isPending} onClick={submit}>
            {k.button}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Producto">
          {(p) => (
            <Select {...p} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Elige un producto</option>
              {products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.quantity} en vitrina)
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={k.qtyLabel} hint={action.kind === 'adjust' && product ? `El sistema tiene ${product.quantity}` : null}>
            {(p) => (
              <Input {...p} type="number" inputMode="numeric" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            )}
          </Field>
          {action.kind === 'entry' && (
            <Field label="Costo unitario" optional hint="Actualiza el costo del producto">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              )}
            </Field>
          )}
          {action.kind === 'transfer' && (
            <Field label="Sede destino">
              {(p) => (
                <Select {...p} value={toBranch} onChange={(e) => setToBranch(e.target.value)}>
                  {branches
                    .filter((b) => b.id !== branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {shortBranch(b.name)}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          )}
        </div>
        <Field label={needsNotes ? 'Motivo' : 'Nota'} optional={!needsNotes}>
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action.kind === 'entry' ? 'Ej.: factura 1234 del proveedor' : 'Ej.: conteo de cierre de mes'}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

function Movements({ branchId }) {
  const { data = [], isPending, error } = useMovements(branchId);
  if (error) return <ErrorState error={error} />;
  if (isPending) return <PageLoader />;
  if (!data.length) return <EmptyState icon={History} title="Aún no hay movimientos" />;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Fecha</Th>
          <Th>Producto</Th>
          <Th>Movimiento</Th>
          <Th align="right">Cantidad</Th>
          <Th>Nota</Th>
          <Th>Registró</Th>
        </tr>
      </thead>
      <tbody>
        {data.map((m) => (
          <tr key={m.id}>
            <Td className="tabular whitespace-nowrap text-ink-soft">{dateTime(m.created_at)}</Td>
            <Td className="font-medium">{m.product?.name}</Td>
            <Td>{MOVEMENT_LABEL[m.type] ?? m.type}</Td>
            <Td align="right" className={cn('font-semibold', m.quantity > 0 ? 'text-sinu-600' : 'text-pole-600')}>
              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
            </Td>
            <Td className="max-w-64 truncate text-ink-soft">{m.notes}</Td>
            <Td className="text-ink-soft">{m.author?.full_name ?? 'Sistema'}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function Inventory() {
  usePageTitle('Inventario');
  const { isAdmin } = useAuth();
  const { branchId, branch, branches } = usePanel();
  const stock = useStock(branchId);
  const [tab, setTab] = useState('stock');
  const [filter, setFilter] = useState('all');
  const [term, setTerm] = useState('');
  const [action, setAction] = useState(null);

  const products = useMemo(() => (stock.data ?? []).filter((p) => p.is_active), [stock.data]);
  const shown = products.filter(
    (p) =>
      (filter === 'all' || (filter === 'low' && p.low && p.quantity > 0) || (filter === 'out' && p.quantity === 0)) &&
      `${p.name} ${p.sku} ${p.brand ?? ''}`.toLowerCase().includes(term.trim().toLowerCase()),
  );
  const totals = products.reduce(
    (acc, p) => ({ units: acc.units + p.quantity, cost: acc.cost + p.quantity * p.cost, retail: acc.retail + p.quantity * p.price }),
    { units: 0, cost: 0, retail: 0 },
  );
  const lowCount = products.filter((p) => p.low).length;

  return (
    <>
      <PageHeader
        title="Inventario"
        description={`Vitrina de la sede ${shortBranch(branch?.name)}. Las ventas descuentan unidades solas.`}
        actions={
          <Button variant="dark" onClick={() => setAction({ kind: 'entry' })}>
            <PackagePlus className="size-4" aria-hidden /> Registrar entrada
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Unidades en vitrina"
          value={number(totals.units)}
          loading={stock.isPending}
          hint={`${products.length} productos activos`}
        />
        <StatTile label="Por reponer" value={number(lowCount)} loading={stock.isPending} hint="En el mínimo o por debajo" />
        <StatTile label="Valor a costo" value={money(totals.cost)} loading={stock.isPending} />
        <StatTile label="Valor de venta" value={money(totals.retail)} loading={stock.isPending} />
      </div>

      <Panel
        padded={false}
        title={
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'stock', label: 'Existencias' },
              { value: 'movements', label: 'Movimientos' },
            ]}
          />
        }
        actions={
          tab === 'stock' && (
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'low', label: 'Bajo mínimo' },
                { value: 'out', label: 'Agotados' },
              ]}
            />
          )
        }
      >
        {tab === 'movements' ? (
          <Movements branchId={branchId} />
        ) : stock.error ? (
          <ErrorState error={stock.error} onRetry={stock.refetch} />
        ) : stock.isPending ? (
          <PageLoader />
        ) : (
          <>
            <div className="border-b border-line p-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" aria-hidden />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar por nombre o SKU"
                  className="h-10 pl-9"
                  aria-label="Buscar producto"
                />
              </div>
            </div>
            {shown.length === 0 ? (
              <EmptyState title="Ningún producto coincide" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th align="right">Precio</Th>
                    <Th align="right">Costo</Th>
                    <Th>Existencias</Th>
                    <Th>Estado</Th>
                    <Th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => {
                    const pct = Math.min((p.quantity / Math.max(p.min_stock * 3, 1)) * 100, 100);
                    return (
                      <tr key={p.id} className="hover:bg-paper/50">
                        <Td>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-ink-mute">
                            {p.sku}, {p.category?.name}
                          </p>
                        </Td>
                        <Td align="right">{money(p.price)}</Td>
                        <Td align="right" className="text-ink-soft">
                          {money(p.cost)}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="tabular w-8 text-right font-semibold">{p.quantity}</span>
                            <div className="h-1.5 w-24 rounded-full bg-paper" title={`Mínimo ${p.min_stock}`}>
                              <div
                                className={cn('h-1.5 rounded-full', p.quantity === 0 ? 'bg-pole-500' : p.low ? 'bg-amber-600' : 'bg-chart')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-ink-mute">mín. {p.min_stock}</span>
                          </div>
                        </Td>
                        <Td>
                          {p.quantity === 0 ? (
                            <Badge tone="pole">Agotado</Badge>
                          ) : p.low ? (
                            <Badge tone="amber">Reponer</Badge>
                          ) : (
                            <Badge tone="sinu">Bien</Badge>
                          )}
                        </Td>
                        <Td>
                          <Menu
                            trigger={
                              <IconButton label={`Acciones de ${p.name}`} size="icon-sm">
                                <MoreHorizontal className="size-4" />
                              </IconButton>
                            }
                          >
                            <MenuItem icon={PackagePlus} onSelect={() => setAction({ kind: 'entry', product: p })}>
                              Entrada de mercancía
                            </MenuItem>
                            <MenuItem icon={ClipboardCheck} onSelect={() => setAction({ kind: 'adjust', product: p })}>
                              Ajustar por conteo
                            </MenuItem>
                            <MenuItem icon={PackageMinus} onSelect={() => setAction({ kind: 'waste', product: p })}>
                              Registrar merma
                            </MenuItem>
                            {isAdmin && branches.length > 1 && (
                              <>
                                <MenuSeparator />
                                <MenuItem icon={ArrowLeftRight} onSelect={() => setAction({ kind: 'transfer', product: p })}>
                                  Trasladar a otra sede
                                </MenuItem>
                              </>
                            )}
                          </Menu>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Panel>

      <ActionModal action={action} onClose={() => setAction(null)} products={products} branchId={branchId} branches={branches} />
    </>
  );
}
