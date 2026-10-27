import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { slugify, uploadImage, useAdminCatalog, useSaveRow } from '@/api/admin';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { duration, money } from '@/lib/format';
import { publicUrl } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { PageHeader, Panel, Table, Td, Th } from '@/components/panel/PanelUI';
import { ProductArt } from '@/components/brand/ProductArt';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Switch, Textarea } from '@/components/ui/Field';
import { ErrorState, PageLoader, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';

const DURATIONS = [10, 15, 20, 30, 40, 45, 60, 75, 90, 120];

function ImageField({ value, onChange, folder, fallbackName }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const url = publicUrl('catalog', value);
  return (
    <div className="flex items-center gap-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-md bg-bone-100 ring-1 ring-line">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <ProductArt name={fallbackName || 'Producto'} />}
      </div>
      <div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden />} {value ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {value && (
          <button type="button" className="ml-3 text-sm text-ink-soft hover:text-pole-600" onClick={() => onChange(null)}>
            Quitar
          </button>
        )}
        <p className="mt-1.5 text-xs text-ink-mute">Opcional. JPG, PNG o WEBP, máximo 3 MB.</p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              onChange(await uploadImage('catalog', folder, file));
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}

function ServiceModal({ service, categories, onClose }) {
  const save = useSaveRow('services');
  const [f, setF] = useState(null);
  useEffect(() => {
    if (service)
      setF({
        id: service.id,
        name: service.name ?? '',
        category_id: service.category_id ?? categories[0]?.id ?? '',
        description: service.description ?? '',
        duration_minutes: service.duration_minutes ?? 30,
        price: service.price != null ? String(Number(service.price)) : '',
        is_featured: service.is_featured ?? false,
        is_active: service.is_active ?? true,
        sort_order: service.sort_order ?? 0,
        image_url: service.image_url ?? null,
      });
  }, [service, categories]);
  if (!service || !f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.name.trim().length >= 3 && f.category_id && Number(f.price) >= 0 && f.price !== '';

  const submit = async () => {
    try {
      const values = {
        ...f,
        name: f.name.trim(),
        price: Number(f.price),
        duration_minutes: Number(f.duration_minutes),
        description: f.description.trim() || null,
      };
      if (!f.id) values.slug = slugify(f.name);
      await save.mutateAsync(values);
      toast.success(f.id ? 'Servicio actualizado' : 'Servicio creado');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={f.id ? 'Editar servicio' : 'Nuevo servicio'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={!valid} loading={save.isPending} onClick={submit}>
            Guardar servicio
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          {(p) => <Input {...p} value={f.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="Categoría">
          {(p) => (
            <Select {...p} value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Duración">
          {(p) => (
            <Select {...p} value={f.duration_minutes} onChange={(e) => set('duration_minutes', Number(e.target.value))}>
              {[...new Set([...DURATIONS, f.duration_minutes])]
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {duration(d)}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Precio (COP)">
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={f.price}
              onChange={(e) => set('price', e.target.value)}
            />
          )}
        </Field>
        <Field label="Orden en la carta" hint="Los números menores salen primero">
          {(p) => <Input {...p} type="number" value={f.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />}
        </Field>
        <Field label="Descripción" className="sm:col-span-2" optional>
          {(p) => <Textarea {...p} rows={2} maxLength={160} value={f.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <ImageField value={f.image_url} onChange={(v) => set('image_url', v)} folder="services" fallbackName={f.name} />
        </div>
        <Switch
          label="Destacado"
          description="Aparece como «De los más pedidos»"
          checked={f.is_featured}
          onChange={(v) => set('is_featured', v)}
        />
        <Switch label="Activo" description="Si lo apagas deja de ofrecerse" checked={f.is_active} onChange={(v) => set('is_active', v)} />
      </div>
    </Modal>
  );
}

function ProductModal({ product, categories, onClose }) {
  const save = useSaveRow('products');
  const [f, setF] = useState(null);
  useEffect(() => {
    if (product)
      setF({
        id: product.id,
        name: product.name ?? '',
        sku: product.sku ?? '',
        brand: product.brand ?? 'Filo & Navaja',
        category_id: product.category_id ?? categories[0]?.id ?? '',
        description: product.description ?? '',
        price: product.price != null ? String(Number(product.price)) : '',
        cost: product.cost != null ? String(Number(product.cost)) : '',
        min_stock: product.min_stock ?? 3,
        is_active: product.is_active ?? true,
        image_url: product.image_url ?? null,
      });
  }, [product, categories]);
  if (!product || !f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.name.trim().length >= 3 && f.sku.trim() && f.category_id && f.price !== '';

  const submit = async () => {
    try {
      await save.mutateAsync({
        ...f,
        name: f.name.trim(),
        sku: f.sku.trim().toUpperCase(),
        brand: f.brand.trim() || null,
        description: f.description.trim() || null,
        price: Number(f.price),
        cost: Number(f.cost || 0),
        min_stock: Number(f.min_stock),
      });
      toast.success(f.id ? 'Producto actualizado' : 'Producto creado', {
        description: f.id ? null : 'Registra la primera entrada desde Inventario.',
      });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={f.id ? 'Editar producto' : 'Nuevo producto'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={!valid} loading={save.isPending} onClick={submit}>
            Guardar producto
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          {(p) => <Input {...p} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Pomada mate 100 g" />}
        </Field>
        <Field label="Código (SKU)">{(p) => <Input {...p} value={f.sku} onChange={(e) => set('sku', e.target.value)} />}</Field>
        <Field label="Marca">{(p) => <Input {...p} value={f.brand} onChange={(e) => set('brand', e.target.value)} />}</Field>
        <Field label="Categoría">
          {(p) => (
            <Select {...p} value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Stock mínimo" hint="Avisa cuando quede esta cantidad o menos">
          {(p) => <Input {...p} type="number" min={0} value={f.min_stock} onChange={(e) => set('min_stock', e.target.value)} />}
        </Field>
        <Field label="Precio de venta">
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={f.price}
              onChange={(e) => set('price', e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Costo"
          hint={f.price && f.cost ? `Margen ${Math.round(((Number(f.price) - Number(f.cost)) / Number(f.price)) * 100)} %` : null}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={f.cost}
              onChange={(e) => set('cost', e.target.value)}
            />
          )}
        </Field>
        <Field label="Descripción" className="sm:col-span-2" optional>
          {(p) => <Textarea {...p} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <ImageField value={f.image_url} onChange={(v) => set('image_url', v)} folder="products" fallbackName={f.name} />
        </div>
        <Switch
          label="Activo"
          description="Si lo apagas deja de venderse y de mostrarse"
          checked={f.is_active}
          onChange={(v) => set('is_active', v)}
        />
      </div>
    </Modal>
  );
}

function CategoriesPanel({ title, table, rows }) {
  const save = useSaveRow(table);
  const [name, setName] = useState('');
  const add = async () => {
    try {
      await save.mutateAsync({ name: name.trim(), slug: slugify(name), sort_order: rows.length + 1 });
      setName('');
      toast.success('Categoría creada');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <Panel title={title} padded={false}>
      <ul className="divide-y divide-line">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <span className={cn('font-medium', !c.is_active && 'text-ink-mute line-through')}>{c.name}</span>
            <Switch
              checked={c.is_active}
              onChange={(v) => save.mutate({ id: c.id, is_active: v })}
              label={<span className="sr-only">Activa</span>}
            />
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-line p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          className="h-10"
          aria-label="Nombre de la categoría"
        />
        <Button variant="outline" disabled={name.trim().length < 3} loading={save.isPending} onClick={add}>
          Agregar
        </Button>
      </div>
    </Panel>
  );
}

export default function Catalog() {
  usePageTitle('Servicios y productos');
  const { data, isPending, error, refetch } = useAdminCatalog();
  const saveService = useSaveRow('services');
  const saveProduct = useSaveRow('products');
  const [tab, setTab] = useState('services');
  const [editingService, setEditingService] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  return (
    <>
      <PageHeader
        title="Servicios y productos"
        description="Lo que cambies aquí se refleja de inmediato en el sitio, la reserva en línea y la caja."
        actions={
          tab === 'services' ? (
            <Button variant="dark" onClick={() => setEditingService({})}>
              <Plus className="size-4" aria-hidden /> Nuevo servicio
            </Button>
          ) : tab === 'products' ? (
            <Button variant="dark" onClick={() => setEditingProduct({})}>
              <Plus className="size-4" aria-hidden /> Nuevo producto
            </Button>
          ) : null
        }
      >
        <div className="mt-5">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'services', label: 'Servicios' },
              { value: 'products', label: 'Productos' },
              { value: 'categories', label: 'Categorías' },
            ]}
          />
        </div>
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <PageLoader />
      ) : tab === 'services' ? (
        <Panel padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Servicio</Th>
                <Th>Categoría</Th>
                <Th align="right">Duración</Th>
                <Th align="right">Precio</Th>
                <Th>Destacado</Th>
                <Th>Activo</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.id} className={cn(!s.is_active && 'text-ink-mute')}>
                  <Td>
                    <p className="font-medium">{s.name}</p>
                    <p className="max-w-md truncate text-xs text-ink-mute">{s.description}</p>
                  </Td>
                  <Td>{s.category?.name}</Td>
                  <Td align="right">{duration(s.duration_minutes)}</Td>
                  <Td align="right">{money(s.price)}</Td>
                  <Td>
                    <button
                      type="button"
                      aria-pressed={s.is_featured}
                      aria-label={s.is_featured ? `Quitar ${s.name} de destacados` : `Destacar ${s.name}`}
                      onClick={() => saveService.mutate({ id: s.id, is_featured: !s.is_featured })}
                      className={cn(
                        'grid size-8 place-items-center rounded-sm hover:bg-paper',
                        s.is_featured ? 'text-brass-600' : 'text-line-strong',
                      )}
                    >
                      <Star className="size-4" fill={s.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  </Td>
                  <Td>
                    <Switch
                      checked={s.is_active}
                      onChange={(v) => saveService.mutate({ id: s.id, is_active: v })}
                      label={<span className="sr-only">Activo</span>}
                    />
                  </Td>
                  <Td>
                    <IconButton label={`Editar ${s.name}`} size="icon-sm" onClick={() => setEditingService(s)}>
                      <Pencil className="size-4" />
                    </IconButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      ) : tab === 'products' ? (
        <Panel padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Categoría</Th>
                <Th align="right">Precio</Th>
                <Th align="right">Costo</Th>
                <Th align="right">Margen</Th>
                <Th>Activo</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => {
                const margin = Number(p.price) ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                return (
                  <tr key={p.id} className={cn(!p.is_active && 'text-ink-mute')}>
                    <Td>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-ink-mute">
                        {p.sku}, {p.brand}
                      </p>
                    </Td>
                    <Td>{p.category?.name}</Td>
                    <Td align="right">{money(p.price)}</Td>
                    <Td align="right">{money(p.cost)}</Td>
                    <Td align="right">
                      <Badge tone={margin >= 40 ? 'sinu' : margin >= 20 ? 'amber' : 'pole'}>{margin} %</Badge>
                    </Td>
                    <Td>
                      <Switch
                        checked={p.is_active}
                        onChange={(v) => saveProduct.mutate({ id: p.id, is_active: v })}
                        label={<span className="sr-only">Activo</span>}
                      />
                    </Td>
                    <Td>
                      <IconButton label={`Editar ${p.name}`} size="icon-sm" onClick={() => setEditingProduct(p)}>
                        <Pencil className="size-4" />
                      </IconButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <CategoriesPanel title="Categorías de servicios" table="service_categories" rows={data.serviceCategories} />
          <CategoriesPanel title="Categorías de productos" table="product_categories" rows={data.productCategories} />
        </div>
      )}

      {data && (
        <>
          <ServiceModal
            key={editingService?.id ?? (editingService ? 'new' : 'none')}
            service={editingService}
            categories={data.serviceCategories}
            onClose={() => setEditingService(null)}
          />
          <ProductModal
            key={editingProduct?.id ?? (editingProduct ? 'new' : 'none')}
            product={editingProduct}
            categories={data.productCategories}
            onClose={() => setEditingProduct(null)}
          />
        </>
      )}
    </>
  );
}
