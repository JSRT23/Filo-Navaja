import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { PageLoader } from '@/components/ui/Feedback';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="contenido" className="flex-1">
        <Suspense
          fallback={
            <div className="pt-24">
              <PageLoader />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

/** Encabezado oscuro de las páginas internas del sitio */
export function PageHero({ title, children, aside }) {
  return (
    <section className="relative overflow-hidden bg-cordovan-900 pb-14 pt-32 text-bone-50 sm:pb-16 sm:pt-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="display text-[clamp(3.25rem,9vw,7rem)]">{title}</h1>
          {children && <div className="mt-5 max-w-xl text-lg leading-relaxed text-bone-100/75">{children}</div>}
        </div>
        {aside}
      </div>
    </section>
  );
}
