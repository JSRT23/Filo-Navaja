import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { clock, firstName, initials, money } from '@/lib/format';
import { WEEK_ORDER, WEEKDAYS } from '@/lib/constants';
import { InstagramGlyph } from '@/components/brand/Glyphs';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Img } from '@/components/ui/Img';
import { sized } from '@/lib/images';

export function BarberCard({ barber, branchName, onOpen, className }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(barber)}
      className={cn(
        'group relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-onyx-800 text-left focus-visible:outline-offset-4',
        className,
      )}
      aria-label={`Ver perfil de ${barber.display_name}`}
    >
      <Img
        src={sized(barber.photo, 720)}
        className="transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.03]"
        fallback={
          <span
            aria-hidden
            className="display pointer-events-none absolute -right-3 top-2 select-none text-[10.5rem] leading-none text-gold-400/[0.16]"
          >
            {initials(barber.display_name)}
          </span>
        }
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-onyx-950 via-onyx-950/35 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-5">
        {branchName && <span className="block text-sm text-bone-100/65">{branchName}</span>}
        <span className="display mt-1 block text-[2.6rem] text-bone-50">{barber.display_name}</span>
        <span className="mt-3 flex flex-wrap gap-1.5">
          {barber.specialties?.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full border border-bone-100/20 px-2.5 py-0.5 text-xs text-bone-100/85">
              {s}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

export function BarberModal({ barber, branch, services = [], open, onOpenChange }) {
  const offered = useMemo(() => (barber ? services.filter((s) => barber.serviceIds?.includes(s.id)) : []), [barber, services]);
  if (!barber) return null;
  const schedule = Object.fromEntries((barber.barber_schedules ?? []).map((s) => [s.weekday, s]));
  const bookUrl = `/reservar?sede=${branch?.slug ?? ''}&barbero=${barber.id}`;

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" hideClose={false}>
      <div className="-mx-6 -mt-4 mb-6 flex items-end gap-5 bg-onyx-900 px-6 pb-6 pt-10 text-bone-50">
        <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-onyx-800">
          <Img
            src={sized(barber.photo, 240)}
            eager
            fallback={<span className="display text-5xl text-gold-400">{initials(barber.display_name)}</span>}
          />
        </span>
        <div className="min-w-0 pb-1">
          <p className="text-sm text-bone-100/65">Sede {branch?.name?.replace('Filo & Navaja ', '')}</p>
          <p className="display text-5xl">{barber.display_name}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          {barber.bio && <p className="leading-relaxed text-ink-soft">{barber.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {barber.specialties?.map((s) => (
              <span key={s} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-line">
                {s}
              </span>
            ))}
          </div>
          {barber.instagram && (
            <a
              href={`https://instagram.com/${barber.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold-700 hover:underline"
            >
              <InstagramGlyph className="size-4" /> @{barber.instagram.replace('@', '')}
            </a>
          )}

          <h3 className="mt-7 text-sm font-semibold text-ink">Servicios que presta</h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {offered.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 py-2">
                <span>{s.name}</span>
                <span className="tabular text-ink-soft">{money(s.price)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Horario en la sede</h3>
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-line">
              {WEEK_ORDER.map((d) => {
                const s = schedule[d];
                return (
                  <tr key={d}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-soft">
                      {WEEKDAYS[d]}
                    </th>
                    <td className="tabular py-2 text-right">
                      {s ? `${clock(s.start_time)} a ${clock(s.end_time)}` : <span className="text-ink-mute">Descansa</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {barber.accepts_online_booking ? (
            <Button to={bookUrl} variant="dark" className="mt-6 w-full" onClick={() => onOpenChange(false)}>
              <CalendarCheck className="size-4" aria-hidden /> Reservar con {firstName(barber.display_name)}
            </Button>
          ) : (
            <p className="mt-6 rounded-md bg-paper p-3 text-sm text-ink-soft">
              {firstName(barber.display_name)} atiende por orden de llegada o reservando en la sede.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
