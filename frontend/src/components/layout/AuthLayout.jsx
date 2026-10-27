import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { SmartImage } from '@/components/SmartImage';
import { PageLoader } from '@/components/ui/Feedback';

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-onyx-950 lg:block">
        <SmartImage photo="chair" className="absolute inset-0 size-full" sizes="50vw" priority imgClassName="opacity-70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-onyx-950 via-onyx-950/50 to-onyx-950/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-bone-50">
          <Logo />
          <div>
            <p className="display max-w-md text-7xl">Tu silla te está esperando.</p>
            <p className="mt-5 max-w-sm text-bone-100/75">
              Reserva en segundos, recibe el recordatorio un día antes y reprograma sin llamar.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-bone-50">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="lg:hidden" style={{ '--logo-pin': '#f8f4ee' }}>
            <Logo tone="dark" />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver al sitio
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10">
          <div className="w-full max-w-md">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
