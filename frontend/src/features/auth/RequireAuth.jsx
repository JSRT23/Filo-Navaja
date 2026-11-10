import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader, ErrorState } from '@/components/ui/Feedback';
import { useAuth, homeForRole } from './context';

/** Protege rutas por sesión y rol. Sin sesión envía a /ingresar y vuelve después. */
export function RequireAuth({ roles, children }) {
  const { user, role, profile, loading, profileError, refresh, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verificando tu sesión…" />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/ingresar?next=${next}`} replace />;
  }
  if (profileError) return <ErrorState error={profileError} onRetry={refresh} className="min-h-[50vh]" />;
  if (profile && profile.is_active === false) {
    return (
      <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="display text-4xl text-onyx-900">Cuenta desactivada</h1>
          <p className="mt-3 text-ink-soft">
            Tu acceso fue desactivado. Si crees que es un error, comunícate con la administración de la barbería.
          </p>
          <button type="button" onClick={signOut} className="mt-6 font-semibold text-gold-700 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }
  if (roles && !roles.includes(role)) return <Navigate to={homeForRole(role)} replace />;
  return children ?? <Outlet />;
}
