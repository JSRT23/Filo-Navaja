import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerSearch, useUpsertCustomer } from '@/api/panel';
import { errorMessage } from '@/lib/errors';
import { phone as fmtPhone } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Feedback';

/** Buscar un cliente por nombre, celular o correo, o registrarlo en el momento */
export function CustomerPicker({ value, onChange, allowEmpty = false, emptyLabel = 'Consumidor final' }) {
  const [term, setTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', phone: '', email: '', consent: true });
  const searching = term.trim().length >= 2;
  const search = useCustomerSearch(searching ? term : '', { limit: 8 });
  const upsert = useUpsertCustomer();

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-paper px-3 py-2.5 ring-1 ring-line">
        <Avatar name={value.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{value.full_name}</p>
          <p className="truncate text-xs text-ink-mute">
            {[fmtPhone(value.phone), value.email].filter(Boolean).join(', ') || 'Sin datos de contacto'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="grid size-8 place-items-center rounded-sm text-ink-mute hover:bg-white hover:text-ink"
          aria-label="Quitar cliente"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (creating) {
    const save = async () => {
      if (draft.fullName.trim().length < 3) return toast.error('Escribe el nombre del cliente');
      try {
        const id = await upsert.mutateAsync(draft);
        onChange({ id, full_name: draft.fullName.trim(), phone: draft.phone.replace(/\D/g, '') || null, email: draft.email || null });
        setCreating(false);
        setDraft({ fullName: '', phone: '', email: '', consent: true });
      } catch (e) {
        toast.error(errorMessage(e));
      }
    };
    return (
      <div className="space-y-3 rounded-md bg-paper p-4 ring-1 ring-line">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Cliente nuevo</p>
          <button type="button" onClick={() => setCreating(false)} className="text-sm text-ink-soft hover:text-ink">
            Buscar en vez de crear
          </button>
        </div>
        <Field label="Nombre">
          {(p) => <Input {...p} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} autoFocus />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Celular" optional>
            {(p) => <Input {...p} type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />}
          </Field>
          <Field label="Correo" optional hint="Para enviarle la confirmación">
            {(p) => <Input {...p} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />}
          </Field>
        </div>
        <Checkbox
          checked={draft.consent}
          onChange={(e) => setDraft({ ...draft, consent: e.target.checked })}
          label="El cliente autorizó el tratamiento de sus datos"
          description="Pregúntale antes de marcar. Sin autorización no se le envían correos."
        />
        <Button variant="dark" size="sm" loading={upsert.isPending} onClick={save}>
          Guardar cliente
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" aria-hidden />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nombre, celular o correo"
          className="pl-9"
          aria-label="Buscar cliente"
        />
        {searching && search.isFetching && <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />}
      </div>
      {(allowEmpty || searching) && (
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-md ring-1 ring-line">
          {allowEmpty && (
            <li>
              <button
                type="button"
                onClick={() => onChange({ id: null, full_name: emptyLabel })}
                className="w-full px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-paper"
              >
                {emptyLabel}
              </button>
            </li>
          )}
          {searching &&
            (search.data ?? []).map((c) => (
              <li key={c.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  onClick={() => onChange(c)}
                  className={cn('flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-paper')}
                >
                  <Avatar name={c.full_name} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.full_name}</span>
                    <span className="block truncate text-xs text-ink-mute">{[fmtPhone(c.phone), c.email].filter(Boolean).join(', ')}</span>
                  </span>
                </button>
              </li>
            ))}
          {searching && search.data?.length === 0 && <li className="px-3 py-3 text-sm text-ink-mute">No hay clientes con «{term}».</li>}
        </ul>
      )}
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreating(true)}>
        <UserPlus className="size-4" aria-hidden /> Registrar cliente nuevo
      </Button>
    </div>
  );
}
