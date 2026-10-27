import { cn } from '@/lib/cn';

// Ilustraciones de la línea de la casa. Se usan cuando el producto no tiene foto.
const PALETTES = [
  { body: '#0e0d0b', label: '#ede5d8', ink: '#0e0d0b', lid: '#c49a48' },
  { body: '#2f5d50', label: '#f8f4ee', ink: '#1b3830', lid: '#070706' },
  { body: '#c49a48', label: '#0e0d0b', ink: '#ede5d8', lid: '#0e0d0b' },
  { body: '#6c787e', label: '#f8f4ee', ink: '#0e0d0b', lid: '#c49a48' },
  { body: '#ede5d8', label: '#0e0d0b', ink: '#ede5d8', lid: '#c49a48' },
];

function kindOf(name = '') {
  const n = name.toLowerCase();
  if (/peine/.test(n)) return 'comb';
  if (/aceite|minoxidil/.test(n)) return 'dropper';
  if (/shampoo|loci[oó]n|aftershave/.test(n)) return 'bottle';
  if (/b[aá]lsamo/.test(n)) return 'tin';
  return 'jar';
}

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function ProductArt({ name, className, background = '#efe8dc' }) {
  const kind = kindOf(name);
  const p = PALETTES[hash(name) % PALETTES.length];
  const short = (name || '').split(' ')[0];
  return (
    <svg viewBox="0 0 200 200" className={cn('h-full w-full', className)} role="img" aria-label={name}>
      <rect width="200" height="200" fill={background} />
      <ellipse cx="100" cy="172" rx="62" ry="7" fill="#0e0d0b" opacity=".12" />
      {kind === 'jar' && (
        <g>
          <rect x="52" y="78" width="96" height="92" rx="10" fill={p.body} />
          <rect x="48" y="62" width="104" height="24" rx="6" fill={p.lid} />
          <rect x="48" y="80" width="104" height="5" fill="#000" opacity=".12" />
          <rect x="60" y="104" width="80" height="42" rx="3" fill={p.label} />
          <text x="100" y="124" textAnchor="middle" fontSize="15" fontWeight="800" fill={p.ink} style={{ fontStretch: '62%' }}>
            F&amp;N
          </text>
          <text x="100" y="139" textAnchor="middle" fontSize="9" fontWeight="600" fill={p.ink} opacity=".75">
            {short}
          </text>
        </g>
      )}
      {kind === 'tin' && (
        <g>
          <rect x="40" y="104" width="120" height="62" rx="12" fill={p.body} />
          <rect x="36" y="92" width="128" height="26" rx="10" fill={p.lid} />
          <ellipse cx="100" cy="99" rx="46" ry="5" fill="#fff" opacity=".18" />
          <rect x="64" y="130" width="72" height="24" rx="3" fill={p.label} />
          <text x="100" y="147" textAnchor="middle" fontSize="13" fontWeight="800" fill={p.ink} style={{ fontStretch: '62%' }}>
            F&amp;N
          </text>
        </g>
      )}
      {kind === 'bottle' && (
        <g>
          <rect x="88" y="34" width="24" height="16" rx="3" fill={p.lid} />
          <rect x="92" y="48" width="16" height="14" fill={p.body} />
          <path d="M70 80a18 18 0 0 1 18-18h24a18 18 0 0 1 18 18v80a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10z" fill={p.body} />
          <rect x="78" y="100" width="44" height="50" rx="3" fill={p.label} />
          <text x="100" y="122" textAnchor="middle" fontSize="13" fontWeight="800" fill={p.ink} style={{ fontStretch: '62%' }}>
            F&amp;N
          </text>
          <text x="100" y="137" textAnchor="middle" fontSize="8" fontWeight="600" fill={p.ink} opacity=".75">
            {short}
          </text>
          <rect x="74" y="72" width="5" height="88" rx="2.5" fill="#fff" opacity=".12" />
        </g>
      )}
      {kind === 'dropper' && (
        <g>
          <ellipse cx="100" cy="36" rx="9" ry="10" fill="#070706" />
          <rect x="88" y="44" width="24" height="22" rx="3" fill={p.lid} />
          <path d="M74 86a14 14 0 0 1 14-14h24a14 14 0 0 1 14 14v74a10 10 0 0 1-10 10H84a10 10 0 0 1-10-10z" fill={p.body} />
          <rect x="82" y="102" width="36" height="46" rx="3" fill={p.label} />
          <text x="100" y="124" textAnchor="middle" fontSize="12" fontWeight="800" fill={p.ink} style={{ fontStretch: '62%' }}>
            F&amp;N
          </text>
          <text x="100" y="138" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={p.ink} opacity=".75">
            {short}
          </text>
          <rect x="78" y="80" width="4" height="80" rx="2" fill="#fff" opacity=".14" />
        </g>
      )}
      {kind === 'comb' && (
        <g transform="rotate(-18 100 110)">
          <rect x="34" y="84" width="132" height="22" rx="6" fill="#8a5a32" />
          {Array.from({ length: 22 }).map((_, i) => (
            <rect key={i} x={40 + i * 5.6} y="104" width="3" height={i < 9 ? 34 : 26} rx="1.2" fill="#8a5a32" />
          ))}
          <rect x="44" y="90" width="40" height="8" rx="2" fill="#0e0d0b" opacity=".25" />
        </g>
      )}
    </svg>
  );
}
