import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration, money } from '@/lib/format';
import { groupByCategory } from '@/api/catalog';
import { Skeleton } from '@/components/ui/Feedback';

/** Carta de servicios con líneas punteadas, como el tablero de la barbería */
export function ServiceMenu({ services, loading, categories, limitPerCategory, columns = 2, tone = 'light', className }) {
  const dark = tone === 'dark';
  if (loading) {
    return (
      <div className={cn('grid gap-x-14 gap-y-12', columns === 2 && 'md:grid-cols-2', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton dark={dark} className="h-8 w-40" />
            {[0, 1, 2].map((j) => (
              <Skeleton dark={dark} key={j} className="h-12 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  let groups = groupByCategory(services);
  if (categories) groups = groups.filter((g) => categories.includes(g.category.slug));

  return (
    <div
      className={cn(
        'grid gap-x-14 gap-y-12',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {groups.map(({ category, items }) => (
        <section key={category.id ?? category.name} aria-labelledby={`cat-${category.slug}`}>
          <h3
            id={`cat-${category.slug}`}
            className={cn('display border-b pb-3 text-4xl', dark ? 'border-bone-100/15 text-bone-50' : 'border-onyx-900/15 text-onyx-900')}
          >
            {category.name}
          </h3>
          <ul>
            {(limitPerCategory ? items.slice(0, limitPerCategory) : items).map((s) => (
              <li key={s.id} className={cn('border-b', dark ? 'border-bone-100/8' : 'border-onyx-900/8')}>
                <Link
                  to={`/reservar?servicio=${s.slug}`}
                  className={cn(
                    'group -mx-3 block rounded-sm px-3 py-3.5 transition-colors',
                    dark ? 'hover:bg-bone-100/5' : 'hover:bg-onyx-900/[0.035]',
                  )}
                >
                  <div className={cn('flex items-baseline gap-3', dark ? 'text-bone-50' : 'text-ink')}>
                    <span className="text-[1.05rem] font-semibold">{s.name}</span>
                    <span aria-hidden className="leader" />
                    <span className="tabular whitespace-nowrap text-[1.05rem] font-semibold">{money(s.price)}</span>
                  </div>
                  <div className={cn('mt-1 flex items-start justify-between gap-4 text-sm', dark ? 'text-bone-100/60' : 'text-ink-soft')}>
                    <p className="max-w-[46ch]">{s.description}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                      <Clock className="size-3.5" aria-hidden />
                      {duration(s.duration_minutes)}
                    </span>
                  </div>
                  {s.is_featured && (
                    <span className={cn('mt-2 inline-block text-xs font-semibold', dark ? 'text-gold-300' : 'text-gold-700')}>
                      De los más pedidos
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
