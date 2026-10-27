import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/** Navaja de barbero abierta: la marca de la casa */
export function RazorMark({ className, title }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M8.6 4.5h16.2a3.7 3.7 0 0 1 3.7 3.7v.6a3 3 0 0 1-3 3H12.4z" fill="currentColor" />
      <path d="M12.6 11.8h12.4" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" />
      <rect x="6" y="7.5" width="5.6" height="21" rx="2.8" fill="currentColor" />
      <circle cx="8.8" cy="10.4" r="1.25" fill="var(--logo-pin, #0e0d0b)" />
    </svg>
  );
}

export function Logo({ to = '/', tone = 'light', className, compact = false }) {
  const light = tone === 'light';
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5', light ? 'text-bone-50' : 'text-onyx-900', className)}
      style={{ '--logo-pin': light ? '#070706' : '#f8f4ee' }}
      aria-label="Filo & Navaja, ir al inicio"
    >
      <RazorMark
        className={cn('size-7 transition-transform duration-300 group-hover:-rotate-6', light ? 'text-gold-400' : 'text-onyx-800')}
      />
      {!compact && <span className="display text-[1.65rem] leading-none tracking-[-0.01em]">Filo &amp; Navaja</span>}
    </Link>
  );
}
