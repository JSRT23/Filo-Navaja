import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Ruta de inicio según el rol */
export function homeForRole(role) {
  if (role === 'admin' || role === 'receptionist') return '/panel';
  if (role === 'barber') return '/panel/agenda';
  return '/mi-cuenta';
}
