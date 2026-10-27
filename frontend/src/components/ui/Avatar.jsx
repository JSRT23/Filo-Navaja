import { useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { sized } from '@/lib/images';

const PX = { xs: 28, sm: 36, md: 44, lg: 64, xl: 96 };

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
  const url = sized(src, (PX[size] ?? 44) * 2);
  const showImg = url && !failed;
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden bg-onyx-800 font-bold text-gold-300 condensed',
        square ? 'rounded-md' : 'rounded-full',
        SIZES[size],
        className,
      )}
      style={color ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      {showImg ? (
        <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{initials(name) || '·'}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
