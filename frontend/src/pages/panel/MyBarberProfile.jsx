import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { uploadImage } from '@/api/admin';
import { useServices } from '@/api/catalog';
import { useAuth } from '@/features/auth/context';
import { PasswordInput, passwordRule } from '@/features/auth/forms';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { WEEK_ORDER, WEEKDAYS } from '@/lib/constants';
import { clock, money } from '@/lib/format';
import { publicUrl, supabase, unwrap } from '@/lib/supabase';
import { PageHeader, Panel } from '@/components/panel/PanelUI';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Feedback';

export default function MyBarberProfile() {
  usePageTitle('Mi perfil');
  const qc = useQueryClient();
  const { barber, refresh } = useAuth();
  const { data: services = [] } = useServices();
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ bio: '', specialties: '', instagram: '' });
  const [schedule, setSchedule] = useState([]);
  const [offered, setOffered] = useState([]);
  const [pwd, setPwd] = useState('');

  useEffect(() => {
    if (!barber) return;
    setF({ bio: barber.bio ?? '', specialties: (barber.specialties ?? []).join(', '), instagram: barber.instagram ?? '' });
    Promise.all([
      supabase.from('barber_schedules').select('*').eq('barber_id', barber.id),
      supabase.from('barber_services').select('service_id').eq('barber_id', barber.id),
    ]).then(([s, o]) => {
      setSchedule(s.data ?? []);
      setOffered((o.data ?? []).map((x) => x.service_id));
    });
  }, [barber]);

  if (!barber) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      unwrap(
        await supabase
          .from('barbers')
          .update({
            bio: f.bio.trim() || null,
            instagram: f.instagram.trim().replace('@', '') || null,
            specialties: f.specialties
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
          .eq('id', barber.id),
      );
      await refresh();
      qc.invalidateQueries({ queryKey: ['public', 'barbers'] });
      toast.success('Perfil actualizado', { description: 'Ya se ve así en la web.' });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage('barbers', barber.id, file);
      unwrap(await supabase.from('barbers').update({ photo_url: path }).eq('id', barber.id));
      await refresh();
      qc.invalidateQueries({ queryKey: ['public', 'barbers'] });
      toast.success('Foto actualizada');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async () => {
    const check = passwordRule.safeParse(pwd);
    if (!check.success) return toast.error(check.error.issues[0].message);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(errorMessage(error));
    setPwd('');
    toast.success('Contraseña actualizada');
  };

  const bySchedule = Object.fromEntries(schedule.map((s) => [s.weekday, s]));

  return (
    <>
      <PageHeader title="Mi perfil" description="Así te ven los clientes en la web cuando eligen con quién reservar." />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Presentación"
          actions={
            <Button variant="dark" size="sm" loading={saving} onClick={saveProfile}>
              Guardar
            </Button>
          }
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar
                name={barber.display_name}
                src={publicUrl('barbers', barber.photo_url)}
                size="xl"
                square
                color={barber.calendar_color}
              />
              {uploading && (
                <span className="absolute inset-0 grid place-items-center rounded-md bg-onyx-950/50 text-bone-50">
                  <Spinner />
                </span>
              )}
            </div>
            <div>
              <p className="semi-condensed text-2xl font-bold">{barber.display_name}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <Camera className="size-4" aria-hidden /> Cambiar foto
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => uploadPhoto(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Presentación" className="sm:col-span-2" hint={`${f.bio.length}/280 caracteres`}>
              {(p) => <Textarea {...p} rows={4} maxLength={280} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />}
            </Field>
            <Field label="Especialidades" hint="Separadas por coma">
              {(p) => <Input {...p} value={f.specialties} onChange={(e) => setF({ ...f, specialties: e.target.value })} />}
            </Field>
            <Field label="Instagram" optional>
              {(p) => (
                <Input {...p} value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="usuario" />
              )}
            </Field>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Mi horario" description="Lo ajusta administración">
            <dl className="space-y-1.5 text-sm">
              {WEEK_ORDER.map((d) => (
                <div key={d} className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{WEEKDAYS[d]}</dt>
                  <dd className="tabular">
                    {bySchedule[d] ? (
                      `${clock(bySchedule[d].start_time)} a ${clock(bySchedule[d].end_time)}`
                    ) : (
                      <span className="text-ink-mute">Descanso</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Servicios que ofreces">
            <ul className="divide-y divide-line text-sm">
              {services
                .filter((s) => offered.includes(s.id))
                .map((s) => (
                  <li key={s.id} className="flex justify-between py-2">
                    <span>{s.name}</span>
                    <span className="tabular text-ink-soft">{money(s.price)}</span>
                  </li>
                ))}
            </ul>
          </Panel>
          <Panel title="Contraseña">
            <div className="flex gap-2">
              <div className="flex-1">
                <PasswordInput
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Contraseña nueva"
                  aria-label="Contraseña nueva"
                  autoComplete="new-password"
                />
              </div>
              <Button variant="outline" onClick={changePassword} disabled={!pwd}>
                Cambiar
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
