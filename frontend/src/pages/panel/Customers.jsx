import { useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, UserPlus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAnonymizeCustomer, useCustomerHistory, useCustomerSearch, useUpdateCustomer, useUpsertCustomer } from '@/api/panel';
import { useAuth } from '@/features/auth/context';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorMessage } from '@/lib/errors';
import { PAYMENT } from '@/lib/constants';
import { money, phone, shortDate, telLink, time, whatsappLink } from '@/lib/format';
import { PageHeader, Panel, Table, Td, Th } from '@/components/panel/PanelUI';
import { shortBranch } from '@/components/site/Branches';
import { WhatsAppGlyph } from '@/components/brand/Glyphs';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Segmented, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/Modal';

function NewCustomerModal({ open, onOpenChange }) {
  const upsert = useUpsertCustomer();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', consent: false, notes: '' });
  useEffect(() => {
    if (open) setForm({ fullName: '', phone: '', email: '', consent: false, notes: '' });
  }, [open]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async () => {
    try {
      await upsert.mutateAsync(form);
      toast.success('Cliente guardado', { description: 'Si ya existía con ese celular o correo, se actualizó su ficha.' });
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar cliente"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="dark" disabled={form.fullName.trim().length < 3} loading={upsert.isPending} onClick={submit}>
            Guardar cliente
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre y apellido">{(p) => <Input {...p} value={form.fullName} onChange={set('fullName')} autoFocus />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Celular" optional>
            {(p) => <Input {...p} type="tel" value={form.phone} onChange={set('phone')} />}
          </Field>
          <Field label="Correo" optional>
            {(p) => <Input {...p} type="email" value={form.email} onChange={set('email')} />}
          </Field>
        </div>
        <Field label="Preferencias" optional hint="Cómo le gusta el corte, alergias, etc. Solo lo ve el personal.">
          {(p) => <Textarea {...p} rows={2} value={form.notes} onChange={set('notes')} />}
        </Field>
        <Checkbox
          checked={form.consent}
          onChange={set('consent')}
          label="El cliente autorizó el tratamiento de sus datos"
          description="Ley 1581 de 2012. Pregúntale antes de marcar."
        />
      </div>
    </Modal>
  );
}

function CustomerDrawer({ customer, onClose }) {
  const { isAdmin } = useAuth();
  const history = useCustomerHistory(customer?.id);
  const update = useUpdateCustomer();
  const anonymize = useAnonymizeCustomer();
  const [notes, setNotes] = useState('');
  const [confirmAnon, setConfirmAnon] = useState(false);
  const [tab, setTab] = useState('citas');

  useEffect(() => {
    setNotes(customer?.notes ?? '');
    setTab('citas');
  }, [customer]);

  if (!customer) return null;
  const appts = history.data?.appointments ?? [];
  const sales = (history.data?.sales ?? []).filter((s) => s.status === 'completed');
  const visits = appts.filter((a) => a.status === 'completed').length;
  const noShows = appts.filter((a) => a.status === 'no_show').length;
  const spent = sales.reduce((s, x) => s + Number(x.total), 0);

  return (
    <Drawer
      open={Boolean(customer)}
      onOpenChange={(o) => !o && onClose()}
      title="Ficha del cliente"
      width="max-w-lg"
      footer={
        isAdmin && (
          <Button variant="danger-ghost" size="sm" onClick={() => setConfirmAnon(true)}>
            <UserX className="size-4" aria-hidden /> Suprimir datos personales
          </Button>
        )
      }
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={customer.full_name} size="lg" />
          <div className="min-w-0">
            <p className="semi-condensed truncate text-2xl font-bold">{customer.full_name}</p>
            <p className="text-sm text-ink-mute">Cliente desde {shortDate(customer.created_at)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {customer.phone && (
            <>
              <Button href={telLink(customer.phone)} variant="outline" size="xs">
                {phone(customer.phone)}
              </Button>
              <Button
                href={whatsappLink(customer.phone.length === 10 ? `57${customer.phone}` : customer.phone)}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                size="xs"
              >
                <WhatsAppGlyph className="size-3.5" /> WhatsApp
              </Button>
            </>
          )}
          {customer.email && (
            <Button href={`mailto:${customer.email}`} variant="outline" size="xs">
              {customer.email}
            </Button>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            ['Visitas', visits],
            ['No asistió', noShows],
            ['Ha gastado', money(spent)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-paper px-2 py-3">
              <dt className="text-xs text-ink-mute">{k}</dt>
              <dd className="tabular condensed mt-0.5 text-xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-center gap-2 text-sm">
          {customer.data_consent_at ? (
            <span className="inline-flex items-center gap-1.5 text-sinu-600">
              <ShieldCheck className="size-4" aria-hidden /> Autorizó datos el {shortDate(customer.data_consent_at)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-600">
              <ShieldOff className="size-4" aria-hidden /> Sin autorización de datos
            </span>
          )}
          {customer.profile_id && <Badge tone="sinu">Tiene cuenta en línea</Badge>}
        </div>

        <Field label="Preferencias" className="mt-5" hint="Solo lo ve el personal.">
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: degradado medio, no le gusta la máquina en la nuca"
            />
          )}
        </Field>
        {notes !== (customer.notes ?? '') && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            loading={update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ id: customer.id, notes: notes || null });
                toast.success('Preferencias guardadas');
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          >
            Guardar preferencias
          </Button>
        )}

        <div className="mt-7">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'citas', label: `Citas (${appts.length})` },
              { value: 'compras', label: `Compras (${sales.length})` },
            ]}
          />
          {history.isPending ? (
            <PageLoader />
          ) : tab === 'citas' ? (
            <ul className="mt-3 divide-y divide-line">
              {appts.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">Sin citas registradas</li>}
              {appts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="tabular w-24 shrink-0 text-ink-soft">{shortDate(a.starts_at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.service_name}</span>
                    <span className="block truncate text-xs text-ink-mute">
                      {time(a.starts_at)}, {a.barber_name}, {shortBranch(a.branch_name)}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {sales.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">Sin compras registradas</li>}
              {sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="tabular text-ink-soft">
                    #{s.number}, {shortDate(s.created_at)}
                  </span>
                  <span className="text-ink-soft">{PAYMENT[s.payment_method]}</span>
                  <span className="tabular font-semibold">{money(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmAnon}
        onOpenChange={setConfirmAnon}
        title="¿Suprimir los datos de este cliente?"
        confirmLabel="Suprimir datos"
        loading={anonymize.isPending}
        onConfirm={async () => {
          try {
            await anonymize.mutateAsync(customer.id);
            toast.success('Datos suprimidos');
            setConfirmAnon(false);
            onClose();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Se borran nombre, celular, correo y preferencias, y se cancelan sus citas futuras. Las ventas se conservan como «Cliente anónimo»
        para la contabilidad. Úsalo cuando el titular lo pida (derecho de supresión).
      </ConfirmDialog>
    </Drawer>
  );
}

export default function Customers() {
  usePageTitle('Clientes');
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);
  const search = useCustomerSearch(debounced, { limit: 60 });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Busca por nombre, celular o correo. Toca un cliente para ver su historial y preferencias."
        actions={
          <Button variant="dark" onClick={() => setCreating(true)}>
            <UserPlus className="size-4" aria-hidden /> Registrar cliente
          </Button>
        }
      />
      <Panel padded={false}>
        <div className="border-b border-line p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" aria-hidden />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar cliente"
              className="h-10 pl-9"
              aria-label="Buscar cliente"
            />
          </div>
        </div>
        {search.error ? (
          <ErrorState error={search.error} onRetry={search.refetch} />
        ) : search.isPending ? (
          <PageLoader />
        ) : !search.data?.length ? (
          <EmptyState
            title={debounced ? `No hay clientes con «${debounced}»` : 'Aún no hay clientes'}
            action={
              <Button variant="outline" onClick={() => setCreating(true)}>
                Registrar cliente
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Celular</Th>
                <Th>Correo</Th>
                <Th>Datos</Th>
                <Th>Desde</Th>
              </tr>
            </thead>
            <tbody>
              {search.data.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer hover:bg-paper/60">
                  <Td>
                    <button type="button" className="flex items-center gap-3 text-left font-medium" onClick={() => setSelected(c)}>
                      <Avatar name={c.full_name} size="xs" />
                      <span>
                        {c.full_name}
                        {c.profile_id && <span className="ml-2 text-xs font-normal text-sinu-600">con cuenta</span>}
                      </span>
                    </button>
                  </Td>
                  <Td className="tabular text-ink-soft">{phone(c.phone) || '—'}</Td>
                  <Td className="text-ink-soft">{c.email || '—'}</Td>
                  <Td>{c.data_consent_at ? <Badge tone="sinu">Autorizó</Badge> : <Badge tone="amber">Pendiente</Badge>}</Td>
                  <Td className="tabular text-ink-soft">{shortDate(c.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <NewCustomerModal open={creating} onOpenChange={setCreating} />
      <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
    </>
  );
}
