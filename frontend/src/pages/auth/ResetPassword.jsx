import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { InlineAlert, PageLoader } from '@/components/ui/Feedback';
import { PasswordInput, passwordRule } from '@/features/auth/forms';
import { useAuth, homeForRole } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';

const schema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

export default function ResetPassword() {
  usePageTitle('Nueva contraseña');
  const { user, role, ready, setRecovering } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setServerError(errorMessage(error));
    setRecovering(false);
    toast.success('Contraseña actualizada');
    navigate(homeForRole(role), { replace: true });
  };

  if (!ready) return <PageLoader />;

  return (
    <>
      <h1 className="display text-6xl text-onyx-900">Contraseña nueva</h1>
      {!user ? (
        <div className="mt-6 space-y-4">
          <InlineAlert tone="amber">El enlace venció o ya se usó. Solicita uno nuevo para cambiar tu contraseña.</InlineAlert>
          <Button to="/recuperar" variant="dark" className="w-full">
            Solicitar otro enlace
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
          {serverError && <InlineAlert>{serverError}</InlineAlert>}
          <Field label="Contraseña nueva" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números">
            {(p) => <PasswordInput {...p} autoComplete="new-password" {...register('password')} />}
          </Field>
          <Field label="Repite la contraseña" error={errors.confirm?.message}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" {...register('confirm')} />}
          </Field>
          <Button type="submit" variant="dark" size="lg" className="w-full" loading={isSubmitting}>
            Guardar contraseña
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to="/" className="font-semibold text-gold-700 hover:underline">
          Ir al inicio
        </Link>
      </p>
    </>
  );
}
