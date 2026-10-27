import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokeFunction, supabase, publicUrl } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { shortDate } from '@/lib/format';
import { useAuth } from '@/features/auth/context';
import { PasswordInput, passwordRule, phoneRule } from '@/features/auth/forms';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AccountNav } from './AccountNav';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field, Input, Switch } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert, Spinner } from '@/components/ui/Feedback';

const profileSchema = z.object({
  full_name: z.string().trim().min(3, 'Escribe tu nombre y apellido').max(80),
  phone: phoneRule,
});
const passwordSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

function Card({ title, description, children, className }) {
  return (
    <section className={`rounded-xl bg-white p-6 ring-1 ring-line sm:p-7 ${className ?? ''}`}>
      <h2 className="semi-condensed text-xl font-bold text-cordovan-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AvatarUploader() {
  const { user, profile, refresh } = useAuth();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast.error('Usa una imagen JPG, PNG o WEBP');
    if (file.size > 2 * 1024 * 1024) return toast.error('La imagen debe pesar menos de 2 MB');
    setBusy(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id);
      if (error) throw error;
      if (profile?.avatar_url && !/^https?:/.test(profile.avatar_url)) await supabase.storage.from('avatars').remove([profile.avatar_url]);
      await refresh();
      toast.success('Foto actualizada');
    } catch (e) {
      toast.error('No se pudo subir la foto', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar name={profile?.full_name} src={publicUrl('avatars', profile?.avatar_url)} size="xl" />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-cordovan-950/50 text-bone-50">
            <Spinner />
          </span>
        )}
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Camera className="size-4" aria-hidden /> Cambiar foto
        </Button>
        <p className="mt-2 text-xs text-ink-mute">JPG, PNG o WEBP de máximo 2 MB.</p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

export default function Profile() {
  usePageTitle('Mi perfil');
  const navigate = useNavigate();
  const { user, profile, customer, refresh, signOut } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    values: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  });
  const pwd = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirm: '' } });

  const saveProfile = async (values) => {
    const { error } = await supabase.from('profiles').update(values).eq('id', user.id);
    if (error) return toast.error(errorMessage(error));
    await refresh();
    toast.success('Datos guardados');
  };

  const savePassword = async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(errorMessage(error));
    pwd.reset();
    toast.success('Contraseña actualizada');
  };

  const updateCustomer = async (patch, message) => {
    setSavingPrefs(true);
    const { error } = await supabase.from('customers').update(patch).eq('id', customer.id);
    setSavingPrefs(false);
    if (error) return toast.error(errorMessage(error));
    await refresh();
    toast.success(message);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await invokeFunction('delete-my-account', { confirm: 'ELIMINAR' });
    } catch (error) {
      setDeleting(false);
      return toast.error('No se pudo eliminar la cuenta', { description: errorMessage(error) });
    }
    setDeleting(false);
    await signOut();
    toast.success('Tu cuenta fue eliminada');
    navigate('/', { replace: true });
  };

  return (
    <div className="bg-bone-50">
      <div className="bg-cordovan-900 pb-10 pt-28 text-bone-50 sm:pt-32">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h1 className="display text-[clamp(3.25rem,8vw,5.5rem)]">Mi perfil</h1>
          <div className="mt-8">
            <AccountNav />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card title="Tus datos" description="Así te identificamos en la sede y en los correos de tus citas.">
            <AvatarUploader />
            <form onSubmit={form.handleSubmit(saveProfile)} noValidate className="mt-6 space-y-4">
              <Field label="Nombre y apellido" error={form.formState.errors.full_name?.message}>
                {(p) => <Input {...p} autoComplete="name" {...form.register('full_name')} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Celular" error={form.formState.errors.phone?.message}>
                  {(p) => <Input {...p} type="tel" autoComplete="tel-national" {...form.register('phone')} />}
                </Field>
                <Field label="Correo" hint="Para cambiarlo escríbenos a la sede.">
                  {(p) => <Input {...p} value={user?.email ?? ''} disabled readOnly />}
                </Field>
              </div>
              <Button type="submit" variant="dark" loading={form.formState.isSubmitting}>
                Guardar cambios
              </Button>
            </form>
          </Card>

          <Card title="Contraseña">
            <form onSubmit={pwd.handleSubmit(savePassword)} noValidate className="grid gap-4 sm:grid-cols-2">
              <Field label="Contraseña nueva" error={pwd.formState.errors.password?.message}>
                {(p) => <PasswordInput {...p} autoComplete="new-password" {...pwd.register('password')} />}
              </Field>
              <Field label="Repítela" error={pwd.formState.errors.confirm?.message}>
                {(p) => <PasswordInput {...p} autoComplete="new-password" {...pwd.register('confirm')} />}
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" loading={pwd.formState.isSubmitting}>
                  Cambiar contraseña
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {customer && (
            <Card title="Privacidad">
              <div className="flex items-start gap-3 rounded-md bg-paper p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sinu-500" aria-hidden />
                {customer.data_consent_at ? (
                  <p className="text-sm text-ink-soft">
                    Autorizaste el tratamiento de tus datos el {shortDate(customer.data_consent_at)}
                    {customer.data_consent_version ? ` (versión ${customer.data_consent_version})` : ''}.
                  </p>
                ) : (
                  <div className="text-sm text-ink-soft">
                    <p>Aún no has autorizado el tratamiento de datos. Lo necesitas para reservar en línea.</p>
                    <Button
                      size="xs"
                      variant="sinu"
                      className="mt-3"
                      loading={savingPrefs}
                      onClick={() => updateCustomer({ data_consent_at: new Date().toISOString() }, 'Autorización registrada')}
                    >
                      Autorizar
                    </Button>
                  </div>
                )}
              </div>
              <Switch
                className="mt-5"
                label="Promociones por correo"
                description="Descuentos y novedades de la barbería."
                checked={customer.marketing_opt_in}
                disabled={savingPrefs}
                onChange={(v) =>
                  updateCustomer({ marketing_opt_in: v }, v ? 'Te avisaremos de las promociones' : 'Ya no recibirás promociones')
                }
              />
            </Card>
          )}

          <Card title="Eliminar cuenta" description="Borra tu cuenta y tus datos personales. Las citas futuras se cancelan.">
            <Button variant="danger-ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" aria-hidden /> Eliminar mi cuenta
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          setConfirmText('');
        }}
        size="sm"
        title="¿Eliminar tu cuenta?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Conservar mi cuenta
            </Button>
            <Button variant="danger" disabled={confirmText !== 'ELIMINAR'} loading={deleting} onClick={deleteAccount}>
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        <InlineAlert tone="pole">Esta acción no se puede deshacer. Se cancelan tus citas futuras y se anonimiza tu historial.</InlineAlert>
        <Field label="Escribe ELIMINAR para confirmar" className="mt-5">
          {(p) => <Input {...p} value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} autoComplete="off" />}
        </Field>
      </Modal>
    </div>
  );
}
