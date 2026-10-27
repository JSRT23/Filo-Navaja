import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BellRing, CalendarClock, RotateCcw } from 'lucide-react';
import { useBarbers, useBranches, useProducts, useServices, useSettings } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { money, number } from '@/lib/format';
import { groupHours } from '@/lib/hours';
import { cn } from '@/lib/cn';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Feedback';
import { ServiceMenu } from '@/components/site/ServiceMenu';
import { BarberCard, BarberModal } from '@/components/site/Barbers';
import { ProductCard, ProductModal } from '@/components/site/Products';
import { BranchCard, shortBranch } from '@/components/site/Branches';
import { NextSlotPanel } from '@/components/site/NextSlotPanel';

const ease = [0.22, 1, 0.36, 1];

function Hero({ branches, services }) {
  const service = services.find((s) => s.slug === 'corte-clasico') ?? services[0];
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-onyx-950 text-bone-50">
      <motion.div
        className="absolute inset-0 -z-10 lg:left-[30%] lg:[mask-image:linear-gradient(to_right,transparent,#000_35%)]"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease }}
      >
        <SmartImage photo="hero" priority className="grain size-full" sizes="(min-width: 1024px) 70vw, 100vw" />
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-onyx-950 via-onyx-950/55 to-onyx-950/30 lg:bg-gradient-to-r lg:from-onyx-950 lg:via-onyx-950/80 lg:to-onyx-950/10"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-onyx-950 to-transparent" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-12 pt-28 sm:px-8 sm:pb-16 lg:pb-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h1 className="display text-[clamp(5.4rem,27vw,15.5rem)] text-bone-50">
              <span className="block overflow-hidden pb-[0.04em]">
                <motion.span
                  className="gold-metal block"
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease, delay: 0.15 }}
                >
                  Filo &amp;
                </motion.span>
              </span>
              <span className="-mb-[0.12em] block overflow-hidden pb-[0.18em]">
                <motion.span
                  className="gold-metal block"
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease, delay: 0.27 }}
                >
                  Navaja
                </motion.span>
              </span>
            </h1>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.6 }}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-bone-100/80 sm:text-xl">
                Barbería en Montería. Corte, barba y afeitado a navaja con toalla caliente, en La Castellana y en el Centro.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button to="/reservar" size="lg">
                  Reservar turno
                </Button>
                <Button to="/servicios" size="lg" variant="light">
                  Ver servicios y precios
                </Button>
              </div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.8 }}>
            {branches.length > 0 && service ? (
              <NextSlotPanel branches={branches} service={service} />
            ) : (
              <Skeleton dark className="h-44 w-80 rounded-lg" />
            )}
          </motion.div>
        </div>
      </div>
      <div aria-hidden className="pole-stripes h-1.5" />
    </section>
  );
}

function SectionHeading({ title, children, action, className, tone = 'light' }) {
  return (
    <div className={cn('mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        <h2 className={cn('display text-[clamp(3rem,7vw,5.5rem)]', tone === 'dark' ? 'text-bone-50' : 'text-onyx-900')}>{title}</h2>
        {children && (
          <p className={cn('mt-4 text-lg leading-relaxed', tone === 'dark' ? 'text-bone-100/70' : 'text-ink-soft')}>{children}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function House({ branches, barbers, services }) {
  const hours = branches[0]?.branch_hours ?? [];
  const minPrice = services.length ? Math.min(...services.map((s) => s.price)) : null;
  return (
    <section className="bg-bone-50 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="grid grid-cols-5 grid-rows-[auto_auto] gap-3 sm:gap-4">
          <SmartImage photo="beard" className="col-span-3 row-span-2 aspect-[3/4] rounded-lg" sizes="(min-width: 1024px) 30vw, 60vw" />
          <SmartImage photo="scissors" className="col-span-2 aspect-square rounded-lg" sizes="(min-width: 1024px) 20vw, 40vw" />
          <SmartImage photo="room" className="col-span-2 aspect-square rounded-lg" sizes="(min-width: 1024px) 20vw, 40vw" />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="display text-[clamp(3rem,6.5vw,5.25rem)] text-onyx-900">Toalla caliente, navaja recta y tiempo para conversar.</h2>
          <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-ink-soft">
            <p>
              Somos {barbers.length ? number(barbers.length) : 'nueve'} barberos repartidos en {branches.length || 'dos'} sedes de Montería.
              Aquí no hay afán: cada turno tiene su tiempo reservado, así que nadie te corta a las carreras para atender al siguiente.
            </p>
            <p>
              Trabajamos el corte clásico de tijera, el degradado bien difuminado y la barba perfilada a navaja.
              {minPrice ? ` La carta arranca en ${money(minPrice)}.` : ''}
            </p>
          </div>

          {hours.length > 0 && (
            <div className="mt-10 max-w-md rounded-lg bg-onyx-900 p-6 text-bone-50 shadow-ticket">
              <p className="semi-condensed text-lg font-bold">Horario de las dos sedes</p>
              <dl className="mt-4 space-y-2">
                {groupHours(hours).map((g) => (
                  <div key={g.days} className="flex items-baseline gap-3">
                    <dt className="text-bone-100/75">{g.days}</dt>
                    <span aria-hidden className="leader text-bone-100" />
                    <dd className="tabular font-semibold">{g.range}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-bone-100/55">Si una sede cierra un festivo, lo verás al reservar.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Team({ barbers, branches, services }) {
  const [branchFilter, setBranchFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const branchById = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b])), [branches]);
  const shown = barbers.filter((b) => branchFilter === 'all' || b.branch_id === branchFilter);

  return (
    <section className="bg-onyx-900 py-24 text-bone-50 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          tone="dark"
          title="Los barberos"
          action={
            branches.length > 1 && (
              <Segmented
                aria-label="Filtrar por sede"
                value={branchFilter}
                onChange={setBranchFilter}
                tone="dark"
                options={[{ value: 'all', label: 'Todas' }, ...branches.map((b) => ({ value: b.id, label: shortBranch(b.name) }))]}
              />
            )
          }
        >
          Cada uno tiene su mano. Mira en qué se especializa y reserva directo con él.
        </SectionHeading>

        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {barbers.length === 0
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} dark className="aspect-[4/5] w-64 shrink-0 rounded-lg lg:w-auto" />)
            : shown.slice(0, 4).map((b) => (
                <motion.div key={b.id} layout className="w-64 shrink-0 snap-start sm:w-72 lg:w-auto">
                  <BarberCard barber={b} branchName={shortBranch(branchById[b.branch_id]?.name)} onOpen={setSelected} />
                </motion.div>
              ))}
        </div>
        <div className="mt-10">
          <Link to="/barberos" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
            Conoce a los {barbers.length || ''} barberos
          </Link>
        </div>
      </div>
      <BarberModal
        barber={selected}
        branch={selected ? branchById[selected.branch_id] : null}
        services={services}
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </section>
  );
}

function HowToBook({ settings }) {
  const cancelHours = Math.round(Number(settings?.cancellation_window_minutes ?? 120) / 60);
  const reminder = Number(settings?.reminder_hours_before ?? 24);
  const steps = [
    ['Elige la sede', 'La Castellana o el Centro, la que te quede más cerca.'],
    ['Escoge el servicio', 'Cada servicio muestra su precio y cuánto dura.'],
    ['Barbero y hora', 'Tu barbero de confianza o el primero libre. Solo ves horas reales.'],
    ['Confirma', 'Te llega el correo de confirmación y la cita queda en tu cuenta.'],
  ];
  return (
    <section className="bg-bone-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading title="Reservar toma un minuto" />
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {steps.map(([title, text], i) => (
              <li key={title} className="flex gap-5">
                <span className="display text-6xl text-gold-500">{i + 1}</span>
                <div className="pt-1.5">
                  <p className="text-lg font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl bg-white p-7 shadow-card ring-1 ring-line">
            <ul className="space-y-5">
              <li className="flex gap-4">
                <RotateCcw className="mt-0.5 size-5 shrink-0 text-sinu-500" aria-hidden />
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Cancela o reprograma tú mismo</span> hasta {cancelHours} horas antes desde tu
                  cuenta.
                </p>
              </li>
              <li className="flex gap-4">
                <BellRing className="mt-0.5 size-5 shrink-0 text-sinu-500" aria-hidden />
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Te recordamos la cita</span> por correo {reminder} horas antes.
                </p>
              </li>
              <li className="flex gap-4">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-sinu-500" aria-hidden />
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">¿Llegas sin cita?</span> Te atendemos según disponibilidad. Con reserva no
                  esperas.
                </p>
              </li>
            </ul>
            <Button to="/reservar" variant="dark" className="mt-8 w-full">
              Empezar la reserva
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle(null);
  const { data: branches = [] } = useBranches();
  const { data: services = [], isPending: servicesLoading } = useServices();
  const { data: barbers = [] } = useBarbers();
  const { data: products = [], isPending: productsLoading } = useProducts();
  const { data: settings } = useSettings();
  const [product, setProduct] = useState(null);

  return (
    <>
      <Hero branches={branches} services={services} />

      <section className="bg-bone-100 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading
            title="La carta"
            action={
              <Button to="/servicios" variant="outline">
                Ver la carta completa
              </Button>
            }
          >
            Precios en pesos colombianos, con el tiempo que le dedicamos a cada servicio.
          </SectionHeading>
          <ServiceMenu
            services={services}
            loading={servicesLoading}
            categories={['cortes', 'barba', 'combos']}
            limitPerCategory={3}
            columns={3}
          />
        </div>
      </section>

      <House branches={branches} barbers={barbers} services={services} />
      <Team barbers={barbers} branches={branches} services={services} />
      <HowToBook settings={settings} />

      <section className="bg-bone-100 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading
            title="Para la casa"
            action={
              <Button to="/productos" variant="outline">
                Ver todos los productos
              </Button>
            }
          >
            La misma pomada, el aceite y el bálsamo que usamos en la silla. Los consigues en las dos sedes.
          </SectionHeading>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {productsLoading
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
              : products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} branches={branches} onOpen={setProduct} />)}
          </div>
        </div>
        <ProductModal product={product} branches={branches} open={Boolean(product)} onOpenChange={(o) => !o && setProduct(null)} />
      </section>

      <section className="bg-bone-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading title="Dónde estamos">Una en La Castellana, al norte de la ciudad, y otra en pleno Centro.</SectionHeading>
          <div className="grid gap-6 lg:grid-cols-2">
            {branches.length === 0
              ? [0, 1].map((i) => <Skeleton key={i} className="h-[520px] rounded-xl" />)
              : branches.map((b) => <BranchCard key={b.id} branch={b} />)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-onyx-950 py-24 text-bone-50 sm:py-28">
        <SmartImage photo="cut" className="absolute inset-0 opacity-30" imgClassName="grayscale" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-onyx-950 via-onyx-950/85 to-onyx-950/40" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
          <h2 className="display max-w-3xl text-[clamp(3.5rem,9vw,7.5rem)]">¿Ya toca motilarse?</h2>
          <Button to="/reservar" size="lg" className="self-start md:self-auto">
            Reservar turno
          </Button>
        </div>
      </section>
    </>
  );
}
