import { cn } from '@/lib/cn';
import { STATUS } from '@/lib/constants';

const TONES = {
  neutral: 'bg-paper text-ink-soft ring-line',
  sinu: 'bg-sinu-50 text-sinu-600 ring-sinu-100',
  brass: 'bg-brass-300/25 text-brass-700 ring-brass-300/60',
  amber: 'bg-amber-50 text-amber-600 ring-amber-600/20',
  pole: 'bg-pole-50 text-pole-600 ring-pole-100',
  steel: 'bg-steel-300/25 text-steel-600 ring-steel-300/70',
  cordovan: 'bg-cordovan-900 text-bone-100 ring-cordovan-900',
};

export function Badge({ tone = 'neutral', className, children, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const s = STATUS[status] ?? { label: status, tone: 'neutral' };
  return (
    <Badge tone={s.tone} dot className={className}>
      {s.label}
    </Badge>
  );
}
