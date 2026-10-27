import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  usePageTitle('Página no encontrada');
  return (
    <section className="grid min-h-[80vh] place-items-center bg-cordovan-900 px-5 pt-24 text-bone-50">
      <div className="max-w-xl text-center">
        <p className="display text-[clamp(7rem,26vw,14rem)] text-brass-400/80">404</p>
        <h1 className="display mt-2 text-5xl">Aquí no hay nada que cortar</h1>
        <p className="mt-4 text-bone-100/70">La página que buscas no existe o cambió de dirección.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/">Ir al inicio</Button>
          <Button to="/reservar" variant="light">
            Reservar turno
          </Button>
        </div>
      </div>
    </section>
  );
}
