import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { ProductArt } from '@/components/brand/ProductArt';
import { Modal } from '@/components/ui/Modal';
import { Img } from '@/components/ui/Img';
import { sized } from '@/lib/images';

/** Disponibilidad por sede a partir de product_stock */
export function availability(product, branches = []) {
  return branches.map((b) => {
    const qty = product.product_stock?.find((s) => s.branch_id === b.id)?.quantity ?? 0;
    return { branch: b, inStock: qty > 0, low: qty > 0 && qty <= 3 };
  });
}

function availabilityLabel(product, branches) {
  const av = availability(product, branches);
  const inStock = av.filter((a) => a.inStock);
  if (!av.length) return null;
  if (inStock.length === av.length) return { text: 'Disponible en ambas sedes', ok: true };
  if (inStock.length === 0) return { text: 'Agotado por ahora', ok: false };
  return { text: `Solo en ${inStock[0].branch.name.replace('Filo & Navaja ', '')}`, ok: true };
}

export function ProductCard({ product, branches, onOpen, className }) {
  const av = availabilityLabel(product, branches);
  return (
    <button type="button" onClick={() => onOpen?.(product)} className={cn('group block w-full self-start text-left', className)}>
      <span className="relative block aspect-square overflow-hidden rounded-lg bg-bone-100">
        <Img
          src={sized(product.image, 640)}
          className="transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.03]"
          fallback={
            <span className="block size-full transition-transform duration-700 ease-out group-hover:scale-[1.03]">
              <ProductArt name={product.name} />
            </span>
          }
        />
      </span>
      <span className="mt-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="font-semibold text-ink">{product.name}</span>
        <span className="tabular whitespace-nowrap font-semibold">{money(product.price)}</span>
      </span>
      <span className="mt-0.5 block text-sm text-ink-soft">{product.category?.name}</span>
      {av && (
        <span className={cn('mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium', av.ok ? 'text-sinu-600' : 'text-pole-600')}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {av.text}
        </span>
      )}
    </button>
  );
}

export function ProductModal({ product, branches, open, onOpenChange }) {
  if (!product) return null;
  const av = availability(product, branches);
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <div className="grid gap-6 pt-2 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-bone-100">
          <Img src={sized(product.image, 900)} eager fallback={<ProductArt name={product.name} />} />
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-ink-mute sm:pr-10">
            {product.brand === 'Filo & Navaja' ? 'Línea de la casa' : `Marca ${product.brand}`}, {product.category?.name?.toLowerCase()}
          </p>
          <h2 className="display mt-1 text-5xl text-onyx-900 sm:pr-10">{product.name}</h2>
          <p className="tabular mt-3 text-2xl font-semibold">{money(product.price)}</p>
          {product.description && <p className="mt-4 leading-relaxed text-ink-soft">{product.description}</p>}
          <h3 className="mt-6 text-sm font-semibold">Disponibilidad</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {av.map(({ branch, inStock, low }) => (
              <li key={branch.id} className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-ink-mute" aria-hidden />
                  {branch.name.replace('Filo & Navaja ', '')}
                </span>
                <span className={cn('font-medium', inStock ? (low ? 'text-amber-600' : 'text-sinu-600') : 'text-pole-600')}>
                  {inStock ? (low ? 'Últimas unidades' : 'Disponible') : 'Agotado'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-6 text-sm text-ink-mute">Se compra en la sede. Tu barbero te recomienda cómo usarlo.</p>
        </div>
      </div>
    </Modal>
  );
}
