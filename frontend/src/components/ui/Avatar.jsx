import { useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const SIZES = {
  xs: 'size-7 text-[0.7rem]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
};

/** Foto o monograma. El color de agenda del barbero tiñe el anillo. */
export function Avatar({ name, src, size = 'md', color, className, square = false }) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden bg-cordovan-800 font-bold text-brass-300 condensed',
        square ? 'rounded-md' : 'rounded-full',
        SIZES[size],
        className,
      )}
      style={color ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      {showImg ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initials(name) || '·'}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
