import { useServices, useSettings } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHero } from '@/components/layout/PublicLayout';
import { ServiceMenu } from '@/components/site/ServiceMenu';
import { ErrorState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

export default function Services() {
  usePageTitle('Servicios y precios');
  const { data: services = [], isPending, error, refetch } = useServices();
  const { data: settings } = useSettings();
  const cancelHours = Math.round(Number(settings?.cancellation_window_minutes ?? 120) / 60);

  return (
    <>
      <PageHero
        title="Servicios y precios"
        aside={
          <Button to="/reservar" size="lg">
            Reservar turno
          </Button>
        }
      >
        Toca cualquier servicio para reservarlo. El precio que ves es el que pagas: queda fijo desde el momento en que reservas.
      </PageHero>
      <section className="bg-bone-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {error ? <ErrorState error={error} onRetry={refetch} /> : <ServiceMenu services={services} loading={isPending} columns={2} />}
          <div className="mt-20 grid gap-6 border-t border-onyx-900/15 pt-10 text-ink-soft md:grid-cols-3">
            <p>
              <span className="block font-semibold text-ink">Pago en la sede</span>
              Efectivo, tarjeta, transferencia, Nequi o Daviplata.
            </p>
            <p>
              <span className="block font-semibold text-ink">Cambios sin llamar</span>
              Cancela o reprograma desde tu cuenta hasta {cancelHours} horas antes.
            </p>
            <p>
              <span className="block font-semibold text-ink">Niños</span>
              El corte niño aplica hasta los 12 años. Ven con un adulto responsable.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
