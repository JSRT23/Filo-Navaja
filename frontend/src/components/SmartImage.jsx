import { useState } from 'react';
import { cn } from '@/lib/cn';
import { PHOTOS, photoSrcSet, photoUrl } from '@/lib/images';
import { RazorMark } from './brand/Logo';

/**
 * Foto de la galería con carga diferida y un respaldo con la marca si no carga.
 * `photo` es una clave de PHOTOS o una URL directa.
 */
export function SmartImage({ photo, src, alt, className, imgClassName, sizes = '100vw', priority = false, width = 1600, overlay }) {
  const [state, setState] = useState('loading');
  const meta = photo ? PHOTOS[photo] : null;
  const url = src || (photo ? photoUrl(photo, width) : null);
  const srcSet = !src && photo ? photoSrcSet(photo) : undefined;

  return (
    <div className={cn('relative overflow-hidden bg-onyx-800', className)}>
      {state !== 'error' && url && (
        <img
          src={url}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt ?? meta?.alt ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={cn(
            'size-full object-cover transition-[opacity,transform] duration-700 ease-out',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
      {state !== 'loaded' && (
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_30%_20%,#2b2925_0%,#0e0d0b_55%,#070706_100%)]"
        >
          <RazorMark className="size-12 text-gold-500/30" />
        </div>
      )}
      {overlay}
    </div>
  );
}
