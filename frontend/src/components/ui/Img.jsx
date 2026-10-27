import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Imagen remota con aparición suave. Mientras carga, o si no carga
 * (sin conexión, enlace roto o bloqueado), se ve el respaldo.
 * El estado se reinicia cuando cambia la URL.
 * El contenedor debe ser `relative`: la imagen se monta encima del respaldo.
 */
export function Img({ src, alt = '', className, fallback = null, eager = false, ...props }) {
  const [status, setStatus] = useState({ src, value: 'loading' });
  if (status.src !== src) setStatus({ src, value: 'loading' });

  const current = status.src === src ? status.value : 'loading';
  if (!src || current === 'error') return fallback;
  return (
    <>
      {current !== 'loaded' && fallback}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setStatus({ src, value: 'loaded' })}
        onError={() => setStatus({ src, value: 'error' })}
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-500',
          current === 'loaded' ? 'opacity-100' : 'opacity-0',
          className,
        )}
        {...props}
      />
    </>
  );
}
