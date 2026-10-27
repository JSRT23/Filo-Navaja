import { Navigation, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { phone, telLink, whatsappLink } from '@/lib/format';
import { groupHours, openStatus } from '@/lib/hours';
import { BRANCH_PHOTO } from '@/lib/images';
import { SmartImage } from '@/components/SmartImage';
import { WhatsAppGlyph } from '@/components/brand/Glyphs';
import { Button } from '@/components/ui/Button';

export const shortBranch = (name = '') => name.replace('Filo & Navaja ', '');

export function directionsUrl(b) {
  if (b.latitude && b.longitude) return `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.address}, ${b.city}`)}`;
}

export function OpenStatus({ hours, tone = 'light', className }) {
  const s = openStatus(hours);
  if (!s) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium',
        s.open ? (tone === 'dark' ? 'text-sinu-100' : 'text-sinu-600') : tone === 'dark' ? 'text-bone-100/70' : 'text-ink-soft',
        className,
      )}
    >
      <span className="relative flex size-2">
        {s.open && <span className="absolute inline-flex size-full animate-ping rounded-full bg-sinu-500/60" />}
        <span className={cn('relative inline-flex size-2 rounded-full', s.open ? 'bg-sinu-500' : 'bg-steel-500')} />
      </span>
      {s.label}
    </span>
  );
}

export function HoursTable({ hours, className }) {
  return (
    <dl className={cn('space-y-1.5 text-sm', className)}>
      {groupHours(hours).map((g) => (
        <div key={g.days} className={cn('flex justify-between gap-4', g.includesToday && 'font-semibold')}>
          <dt className={g.includesToday ? 'text-ink' : 'text-ink-soft'}>{g.days}</dt>
          <dd className="tabular text-right">{g.range}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BranchCard({ branch, className }) {
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line', className)}>
      <SmartImage
        photo={BRANCH_PHOTO[branch.slug] ?? 'shop'}
        src={branch.cover_url || undefined}
        className="aspect-[16/9]"
        sizes="(min-width: 1024px) 45vw, 100vw"
      />
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="display text-5xl text-cordovan-900">{shortBranch(branch.name)}</h3>
          <OpenStatus hours={branch.branch_hours} />
        </div>
        <p className="mt-2 text-ink-soft">
          {branch.address}, {branch.neighborhood}. {branch.city}
        </p>
        <HoursTable hours={branch.branch_hours} className="mt-5 border-t border-line pt-4" />
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button to={`/reservar?sede=${branch.slug}`} variant="dark" size="sm">
            Reservar en esta sede
          </Button>
          <Button href={directionsUrl(branch)} target="_blank" rel="noreferrer" variant="outline" size="sm">
            <Navigation className="size-4" aria-hidden /> Cómo llegar
          </Button>
          {branch.whatsapp && (
            <Button
              href={whatsappLink(branch.whatsapp, `Hola, escribo a la sede ${shortBranch(branch.name)}`)}
              target="_blank"
              rel="noreferrer"
              variant="outline"
              size="sm"
            >
              <WhatsAppGlyph className="size-4" /> WhatsApp
            </Button>
          )}
          {branch.phone && (
            <Button href={telLink(branch.phone)} variant="ghost" size="sm" aria-label={`Llamar al ${branch.phone}`}>
              <Phone className="size-4" aria-hidden /> {phone(branch.phone) || branch.phone}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
