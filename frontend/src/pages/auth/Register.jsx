import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/forms';
import { useAuth, homeForRole } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Register() {
  usePageTitle('Crear cuenta');
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  useEffect(() => {
    if (user && role) navigate(next && next.startsWith('/') ? next : homeForRole(role), { replace: true });
  }, [user, role, next, navigate]);

  return (
    <>
      <h1 className="display text-6xl text-onyx-900">Crea tu cuenta</h1>
      <p className="mb-8 mt-3 text-ink-soft">Un minuto y quedas listo para reservar en cualquiera de las dos sedes.</p>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <Link to={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-gold-700 hover:underline">
          Ingresa
        </Link>
      </p>
    </>
  );
}
