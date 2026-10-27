import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBarbers, useBranches, useServices } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { PageHero } from '@/components/layout/PublicLayout';
import { BarberCard, BarberModal } from '@/components/site/Barbers';
import { shortBranch } from '@/components/site/Branches';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Field';

export default function Barbers() {
  usePageTitle('Barberos');
  const { data: barbers = [], isPending, error, refetch } = useBarbers();
  const { data: branches = [] } = useBranches();
  const { data: services = [] } = useServices();
  const [branch, setBranch] = useState('all');
  const [specialty, setSpecialty] = useState(null);
  const [selected, setSelected] = useState(null);

  const branchById = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);
  const specialties = useMemo(() => [...new Set(barbers.flatMap((b) => b.specialties ?? []))].sort(), [barbers]);
  const shown = barbers.filter((b) => (branch === 'all' || b.branch_id === branch) && (!specialty || b.specialties?.includes(specialty)));

  return (
    <>
      <PageHero title="El equipo">
        Barberos con oficio y estilos distintos. Filtra por sede o por lo que buscas y reserva con quien te inspire confianza.
      </PageHero>
      <section className="bg-bone-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              aria-label="Sede"
              value={branch}
              onChange={setBranch}
              options={[{ value: 'all', label: 'Todas las sedes' }, ...branches.map((b) => ({ value: b.id, label: shortBranch(b.name) }))]}
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Especialidad">
              {specialties.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={specialty === s}
                  onClick={() => setSpecialty(specialty === s ? null : s)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors',
                    specialty === s ? 'bg-onyx-900 text-bone-50 ring-onyx-900' : 'bg-white text-ink-soft ring-line hover:ring-line-strong',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : isPending ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState title="Ningún barbero coincide con ese filtro">Prueba con otra especialidad o con todas las sedes.</EmptyState>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {shown.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                  >
                    <BarberCard barber={b} branchName={shortBranch(branchById[b.branch_id]?.name)} onOpen={setSelected} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>
      <BarberModal
        barber={selected}
        branch={selected ? branchById[selected.branch_id] : null}
        services={services}
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  );
}
