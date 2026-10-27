import { Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { useBarbers, useBranches, useClosures } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { longDate, phone, telLink, whatsappLink } from '@/lib/format';
import { BRANCH_PHOTO } from '@/lib/images';
import { PageHero } from '@/components/layout/PublicLayout';
import { SmartImage } from '@/components/SmartImage';
import { HoursTable, OpenStatus, directionsUrl, shortBranch } from '@/components/site/Branches';
import { WhatsAppGlyph } from '@/components/brand/Glyphs';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton, InlineAlert } from '@/components/ui/Feedback';

function mapEmbed(b) {
  const lat = Number(b.latitude);
  const lng = Number(b.longitude);
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export default function Branches() {
  usePageTitle('Sedes');
  const { data: branches = [], isPending, error, refetch } = useBranches();
  const { data: barbers = [] } = useBarbers();
  const { data: closures = [] } = useClosures();

  return (
    <>
      <PageHero title="Las sedes">Dos casas, el mismo oficio. Escoge la que te quede de camino.</PageHero>
      <div className="bg-bone-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-20 px-5 sm:px-8">
          {error && <ErrorState error={error} onRetry={refetch} />}
          {isPending && <Skeleton className="h-[560px] rounded-xl" />}
          {branches.map((b, i) => {
            const team = barbers.filter((x) => x.branch_id === b.id);
            const upcoming = closures.filter((c) => !c.branch_id || c.branch_id === b.id);
            return (
              <section key={b.id} aria-labelledby={`sede-${b.slug}`} className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div className={i % 2 ? 'lg:order-2' : ''}>
                  <SmartImage
                    photo={BRANCH_PHOTO[b.slug] ?? 'shop'}
                    src={b.cover_url || undefined}
                    className="aspect-[4/3] rounded-xl"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                  {b.latitude && (
                    <iframe
                      title={`Mapa de ${b.name}`}
                      src={mapEmbed(b)}
                      loading="lazy"
                      className="mt-4 h-56 w-full rounded-xl border-0 bg-bone-100 grayscale-[35%]"
                    />
                  )}
                </div>
                <div>
                  <h2 id={`sede-${b.slug}`} className="display text-[clamp(3.5rem,8vw,6rem)] text-cordovan-900">
                    {shortBranch(b.name)}
                  </h2>
                  <OpenStatus hours={b.branch_hours} className="mt-2" />
                  <ul className="mt-6 space-y-3 text-ink-soft">
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 size-5 shrink-0 text-brass-600" aria-hidden />
                      <span>
                        {b.address}, barrio {b.neighborhood}. {b.city}
                      </span>
                    </li>
                    {b.phone && (
                      <li className="flex gap-3">
                        <Phone className="mt-0.5 size-5 shrink-0 text-brass-600" aria-hidden />
                        <a href={telLink(b.phone)} className="hover:text-ink">
                          {b.phone}
                        </a>
                      </li>
                    )}
                    {b.whatsapp && (
                      <li className="flex gap-3">
                        <WhatsAppGlyph className="mt-0.5 size-5 shrink-0 text-brass-600" />
                        <a href={whatsappLink(b.whatsapp)} target="_blank" rel="noreferrer" className="hover:text-ink">
                          {phone(b.whatsapp)}
                        </a>
                      </li>
                    )}
                    {b.email && (
                      <li className="flex gap-3">
                        <Mail className="mt-0.5 size-5 shrink-0 text-brass-600" aria-hidden />
                        <a href={`mailto:${b.email}`} className="hover:text-ink">
                          {b.email}
                        </a>
                      </li>
                    )}
                  </ul>

                  <h3 className="mt-8 text-sm font-semibold text-ink">Horario</h3>
                  <HoursTable hours={b.branch_hours} className="mt-3 max-w-sm" />

                  {upcoming.length > 0 && (
                    <InlineAlert tone="amber" className="mt-5 max-w-sm">
                      {upcoming.map((c) => (
                        <p key={c.id}>
                          Cerrada el {longDate(c.closed_on)}: {c.reason}
                        </p>
                      ))}
                    </InlineAlert>
                  )}

                  {team.length > 0 && (
                    <>
                      <h3 className="mt-8 text-sm font-semibold text-ink">Quiénes atienden</h3>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {team.map((t) => (
                          <li
                            key={t.id}
                            className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm ring-1 ring-line"
                          >
                            <Avatar name={t.display_name} src={t.photo} size="xs" />
                            {t.display_name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-9 flex flex-wrap gap-3">
                    <Button to={`/reservar?sede=${b.slug}`} variant="dark">
                      Reservar en {shortBranch(b.name)}
                    </Button>
                    <Button href={directionsUrl(b)} target="_blank" rel="noreferrer" variant="outline">
                      <Navigation className="size-4" aria-hidden /> Cómo llegar
                    </Button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
