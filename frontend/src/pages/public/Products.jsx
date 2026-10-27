import { useMemo, useState } from 'react';
import { useBranches, useProducts } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHero } from '@/components/layout/PublicLayout';
import { ProductCard, ProductModal } from '@/components/site/Products';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Field';

export default function Products() {
  usePageTitle('Productos');
  const { data: products = [], isPending, error, refetch } = useProducts();
  const { data: branches = [] } = useBranches();
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => p.category && map.set(p.category.id, p.category));
    return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
  }, [products]);
  const shown = products.filter((p) => category === 'all' || p.category?.id === category);

  return (
    <>
      <PageHero title="Para la casa">
        Fijación, barba, cuidado capilar y afeitado. Lo mismo que usamos en la silla para que el corte te dure hasta la próxima visita.
      </PageHero>
      <section className="bg-bone-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Segmented
            className="mb-10"
            aria-label="Categoría"
            value={category}
            onChange={setCategory}
            options={[{ value: 'all', label: 'Todo' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {isPending
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
                : shown.map((p) => <ProductCard key={p.id} product={p} branches={branches} onOpen={setSelected} />)}
            </div>
          )}
        </div>
      </section>
      <ProductModal product={selected} branches={branches} open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
