import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/errors';
import { useAuth } from './context';

export const passwordRule = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'Incluye al menos una letra')
  .regex(/\d/, 'Incluye al menos un número');

export const phoneRule = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^3\d{9}$/.test(v), 'Escribe un celular colombiano de 10 dígitos (empieza por 3)');

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'Escribe tu nombre y apellido').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido'),
  phone: phoneRule,
  password: passwordRule,
  consent: z.literal(true, { errorMap: () => ({ message: 'Necesitamos tu autorización para guardar tus datos y tus citas' }) }),
});

export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-ink-mute hover:text-ink"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

export function LoginForm({ onSuccess, defaultEmail = '' }) {
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: defaultEmail, password: '' } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const data = await signIn(values.email, values.password);
      onSuccess?.(data);
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <InlineAlert>{serverError}</InlineAlert>}
      <Field label="Correo" error={errors.email?.message}>
        {(p) => (
          <Input {...p} type="email" autoComplete="email" inputMode="email" placeholder="tucorreo@ejemplo.com" {...register('email')} />
        )}
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        {(p) => <PasswordInput {...p} autoComplete="current-password" {...register('password')} />}
      </Field>
      <div className="flex justify-end">
        <Link to="/recuperar" className="text-sm font-medium text-cordovan-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <Button type="submit" variant="dark" size="lg" className="w-full" loading={isSubmitting}>
        Ingresar
      </Button>
      <DemoAccounts
        onPick={(email) => {
          setValue('email', email);
          setValue('password', 'FiloNavaja2026!');
        }}
      />
    </form>
  );
}

export function RegisterForm({ onSuccess }) {
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', consent: false },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const data = await signUp(values);
      if (data.session) onSuccess?.(data);
      else setPendingEmail(values.email);
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  if (pendingEmail) {
    return (
      <div className="rounded-lg border border-sinu-100 bg-sinu-50 p-6 text-center">
        <MailCheck className="mx-auto size-9 text-sinu-500" aria-hidden />
        <p className="mt-3 font-semibold text-ink">Revisa tu correo</p>
        <p className="mt-1 text-sm text-ink-soft">
          Enviamos un enlace de confirmación a <strong>{pendingEmail}</strong>. Ábrelo para activar tu cuenta y luego ingresa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <InlineAlert>{serverError}</InlineAlert>}
      <Field label="Nombre y apellido" error={errors.fullName?.message}>
        {(p) => <Input {...p} autoComplete="name" placeholder="Andrés Montes" {...register('fullName')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...register('email')} />}
        </Field>
        <Field label="Celular" error={errors.phone?.message} hint="Para avisos de tu cita">
          {(p) => <Input {...p} type="tel" autoComplete="tel-national" inputMode="tel" placeholder="300 123 4567" {...register('phone')} />}
        </Field>
      </div>
      <Field label="Contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números">
        {(p) => <PasswordInput {...p} autoComplete="new-password" {...register('password')} />}
      </Field>
      <div>
        <Checkbox
          {...register('consent')}
          label={
            <>
              Autorizo el tratamiento de mis datos personales según la{' '}
              <Link to="/privacidad" target="_blank" className="font-medium text-cordovan-700 underline">
                política de datos
              </Link>{' '}
              (Ley 1581 de 2012).
            </>
          }
          aria-invalid={errors.consent ? true : undefined}
        />
        {errors.consent && <p className="mt-1.5 pl-8 text-sm text-pole-600">{errors.consent.message}</p>}
      </div>
      <Button type="submit" variant="dark" size="lg" className="w-full" loading={isSubmitting}>
        Crear cuenta
      </Button>
    </form>
  );
}

const DEMO = [
  ['admin@filoynavaja.co', 'Administración'],
  ['recepcion.castellana@filoynavaja.co', 'Recepción La Castellana'],
  ['carlos@filoynavaja.co', 'Barbero (Carlos)'],
  ['cliente@ejemplo.com', 'Cliente'],
];

/** Accesos rápidos para la sustentación. Se ocultan con VITE_DEMO_MODE=false. */
function DemoAccounts({ onPick }) {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  return (
    <details className="group rounded-md border border-dashed border-line-strong px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none font-medium text-ink-soft marker:text-ink-mute">Cuentas de demostración</summary>
      <div className="mt-3 grid gap-1.5">
        {DEMO.map(([email, label]) => (
          <button
            key={email}
            type="button"
            onClick={() => onPick(email)}
            className="flex items-center justify-between rounded-sm px-2.5 py-1.5 text-left hover:bg-paper"
          >
            <span className="font-medium text-ink">{label}</span>
            <span className="truncate pl-3 text-xs text-ink-mute">{email}</span>
          </button>
        ))}
        <p className="mt-1 px-2.5 text-xs text-ink-mute">Contraseña de todas: FiloNavaja2026!</p>
      </div>
    </details>
  );
}
