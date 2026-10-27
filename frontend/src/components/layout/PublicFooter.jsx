import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { InstagramGlyph, WhatsAppGlyph } from '@/components/brand/Glyphs';
import { useBranches } from '@/api/catalog';
import { BRAND } from '@/lib/constants';
import { PHOTOS } from '@/lib/images';
import { phone, telLink, whatsappLink } from '@/lib/format';

export function PublicFooter() {
  const { data: branches = [] } = useBranches();
  const authors = [...new Set(Object.values(PHOTOS).map((p) => p.author))];

  return (
    <footer className="relative bg-cordovan-950 text-bone-100/75">
      <div aria-hidden className="pole-stripes h-1.5 opacity-80" />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-10 pt-16 sm:px-8 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-[0.95rem] leading-relaxed">
            Barbería de barrio con oficio de maestro. Corte, barba y afeitado a navaja en {BRAND.city}.
          </p>
          <div className="mt-6 flex gap-2">
            <a
              href={`https://instagram.com/${BRAND.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-full border border-bone-100/15 text-bone-100 transition-colors hover:border-brass-400 hover:text-brass-300"
              aria-label="Instagram de Filo & Navaja"
            >
              <InstagramGlyph />
            </a>
            {branches[0]?.whatsapp && (
              <a
                href={whatsappLink(branches[0].whatsapp, 'Hola, quiero información sobre un turno')}
                target="_blank"
                rel="noreferrer"
                className="grid size-10 place-items-center rounded-full border border-bone-100/15 text-bone-100 transition-colors hover:border-brass-400 hover:text-brass-300"
                aria-label="Escribir por WhatsApp"
              >
                <WhatsAppGlyph />
              </a>
            )}
            <a
              href={`mailto:${BRAND.email}`}
              className="grid size-10 place-items-center rounded-full border border-bone-100/15 text-bone-100 transition-colors hover:border-brass-400 hover:text-brass-300"
              aria-label="Enviar un correo"
            >
              <Mail className="size-4.5" />
            </a>
          </div>
        </div>

        {branches.map((b) => (
          <div key={b.id}>
            <h3 className="semi-condensed text-lg font-bold text-bone-50">{b.name.replace('Filo & Navaja ', '')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brass-400" aria-hidden />
                <span>
                  {b.address}
                  <br />
                  {b.neighborhood}, {b.city}
                </span>
              </li>
              {b.phone && (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-brass-400" aria-hidden />
                  <a href={telLink(b.phone)} className="hover:text-bone-50">
                    {b.phone}
                  </a>
                </li>
              )}
              {b.whatsapp && (
                <li className="flex gap-2.5">
                  <WhatsAppGlyph className="mt-0.5 size-4 shrink-0 text-brass-400" />
                  <a href={whatsappLink(b.whatsapp)} target="_blank" rel="noreferrer" className="hover:text-bone-50">
                    {phone(b.whatsapp)}
                  </a>
                </li>
              )}
            </ul>
          </div>
        ))}

        <nav aria-label="Pie de página">
          <h3 className="semi-condensed text-lg font-bold text-bone-50">El sitio</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              ['/reservar', 'Reservar turno'],
              ['/servicios', 'Servicios y precios'],
              ['/barberos', 'Barberos'],
              ['/productos', 'Productos'],
              ['/mi-cuenta', 'Mis citas'],
              ['/privacidad', 'Tratamiento de datos'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-bone-50">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-bone-100/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-bone-100/50 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} Filo &amp; Navaja. Proyecto académico de Electiva Específica IV, Universidad Cooperativa de
            Colombia.
          </p>
          <p>Fotografías de {authors.join(', ')} en Unsplash.</p>
        </div>
      </div>
    </footer>
  );
}
