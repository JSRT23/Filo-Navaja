import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader, ErrorState } from '@/components/ui/Feedback';
import { useAuth, homeForRole } from './context';

/** Protege rutas por sesión y rol. Sin sesión envía a /ingresar y vuelve después. */
export function RequireAuth({ roles, children }) {
  const { user, role, loading, profileError, refresh } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verificando tu sesión…" />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/ingresar?next=${next}`} replace />;
  }
  if (profileError) return <ErrorState error={profileError} onRetry={refresh} className="min-h-[50vh]" />;
  if (roles && !roles.includes(role)) return <Navigate to={homeForRole(role)} replace />;
  return children ?? <Outlet />;
}
