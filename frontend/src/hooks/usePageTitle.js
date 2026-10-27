import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Filo & Navaja` : 'Filo & Navaja · Barbería en Montería';
  }, [title]);
}
