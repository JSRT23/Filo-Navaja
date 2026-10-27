import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/features/auth/forms';
import { useAuth, homeForRole } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Login() {
  usePageTitle('Ingresar');
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  useEffect(() => {
    if (user && role) navigate(next && next.startsWith('/') ? next : homeForRole(role), { replace: true });
  }, [user, role, next, navigate]);

  return (
    <>
      <h1 className="display text-6xl text-onyx-900">Ingresa</h1>
      <p className="mb-8 mt-3 text-ink-soft">Consulta tus citas, reprograma o reserva de nuevo.</p>
      <LoginForm />
      <p className="mt-8 text-center text-sm text-ink-soft">
        ¿Primera vez en Filo &amp; Navaja?{' '}
        <Link to={`/registro${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-gold-700 hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </>
  );
}
