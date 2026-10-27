import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';

export function Spinner({ className }) {
  return <LoaderCircle aria-hidden className={cn('size-5 animate-spin', className)} />;
}

export function Skeleton({ className, dark = false }) {
  return <div aria-hidden className={cn(dark ? 'skeleton-dark' : 'skeleton', 'rounded-sm', className)} />;
}

export function PageLoader({ label = 'Cargando…', dark = false }) {
  return (
    <div
      role="status"
      className={cn('flex min-h-[40vh] items-center justify-center gap-3 text-sm', dark ? 'text-bone-100/70' : 'text-ink-mute')}
    >
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-cordovan-900/5 text-cordovan-600">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, title = 'No pudimos cargar esta información' }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-pole-50 text-pole-600">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-ink-soft">{errorMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-semibold text-cordovan-700 hover:bg-cordovan-900/5"
        >
          <RefreshCw className="size-4" aria-hidden /> Reintentar
        </button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'pole', children, className, icon: Icon = AlertTriangle }) {
  const tones = {
    pole: 'border-pole-100 bg-pole-50 text-pole-600',
    amber: 'border-amber-600/20 bg-amber-50 text-amber-600',
    sinu: 'border-sinu-100 bg-sinu-50 text-sinu-600',
    steel: 'border-line bg-paper text-ink-soft',
  };
  return (
    <div
      role={tone === 'pole' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-md border px-3.5 py-3 text-sm', tones[tone], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
