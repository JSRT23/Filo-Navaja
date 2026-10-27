import { createContext, useContext } from 'react';

export const PanelContext = createContext(null);

/** Sede activa del panel: la recepción y el barbero quedan fijos en la suya; admin elige. */
export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel debe usarse dentro del panel');
  return ctx;
}
