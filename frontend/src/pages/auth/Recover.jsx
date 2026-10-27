import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/Feedback';
import { usePageTitle } from '@/hooks/usePageTitle';

const schema = z.object({ email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido') });

export default function Recover() {
  usePageTitle('Recuperar contraseña');
  const [sentTo, setSentTo] = useState(null);
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/restablecer` });
    if (error) setServerError(errorMessage(error));
    else setSentTo(email);
  };

  return (
    <>
      <h1 className="display text-6xl text-cordovan-900">Recupera tu acceso</h1>
      <p className="mb-8 mt-3 text-ink-soft">Te enviamos un enlace para crear una contraseña nueva.</p>
      {sentTo ? (
        <div className="rounded-lg border border-sinu-100 bg-sinu-50 p-6 text-center">
          <MailCheck className="mx-auto size-9 text-sinu-500" aria-hidden />
          <p className="mt-3 font-semibold">Revisa tu correo</p>
          <p className="mt-1 text-sm text-ink-soft">
            Si <strong>{sentTo}</strong> tiene una cuenta, en unos minutos llega el enlace. Revisa también la carpeta de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <InlineAlert>{serverError}</InlineAlert>}
          <Field label="Correo de tu cuenta" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" {...register('email')} />}
          </Field>
          <Button type="submit" variant="dark" size="lg" className="w-full" loading={isSubmitting}>
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to="/ingresar" className="font-semibold text-cordovan-700 hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </>
  );
}
