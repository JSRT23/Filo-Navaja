import { useSettings } from '@/api/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BRAND } from '@/lib/constants';
import { PageHero } from '@/components/layout/PublicLayout';

const SECTIONS = [
  {
    title: 'Quién trata tus datos',
    body: [
      `Filo & Navaja, barbería con sedes en La Castellana y el Centro de ${BRAND.city}, es responsable del tratamiento de los datos que nos entregas al crear tu cuenta, reservar o ser atendido en una sede.`,
      `Para cualquier consulta escríbenos a ${BRAND.email}.`,
    ],
  },
  {
    title: 'Qué datos guardamos',
    body: [
      'Nombre, correo, celular y, si lo eliges, una foto de perfil.',
      'Tus citas: sede, barbero, servicio, fecha, estado y las notas que escribas al reservar.',
      'Tus compras en la sede, para el control de caja y la facturación.',
      'Preferencias de corte que anote el personal para atenderte mejor. No guardamos datos de tarjetas: los pagos se hacen en la sede.',
    ],
  },
  {
    title: 'Para qué los usamos',
    body: [
      'Agendar, confirmar, recordar, reprogramar o cancelar tus citas.',
      'Enviarte por correo la confirmación y el recordatorio de cada cita.',
      'Llevar el historial de servicios y la facturación de la sede.',
      'Enviarte promociones solo si lo autorizas en tu perfil. Puedes retirar ese permiso cuando quieras.',
    ],
  },
  {
    title: 'Tus derechos',
    body: [
      'Conocer, actualizar y rectificar tus datos desde "Mi perfil" o pidiéndolo en la sede.',
      'Solicitar prueba de la autorización que nos diste y saber cómo usamos tus datos.',
      'Revocar la autorización y pedir que eliminemos tu cuenta. Desde "Mi perfil" puedes eliminarla tú mismo: tus datos personales se anonimizan y solo se conserva la información contable que exige la ley.',
      'Presentar quejas ante la Superintendencia de Industria y Comercio si consideras que no atendimos tu solicitud.',
    ],
  },
  {
    title: 'Seguridad',
    body: [
      'Cada persona del equipo solo ve lo que necesita para su trabajo: un barbero ve sus propias citas y la recepción solo su sede.',
      'Las contraseñas se guardan cifradas y nadie del equipo puede verlas.',
    ],
  },
];

export default function Privacy() {
  usePageTitle('Tratamiento de datos');
  const { data: settings } = useSettings();
  const version = settings?.privacy_policy_version;

  return (
    <>
      <PageHero title="Tratamiento de datos personales">
        Así cuidamos tu información, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.
      </PageHero>
      <article className="bg-bone-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          {version && <p className="mb-10 text-sm text-ink-mute">Versión vigente: {version}</p>}
          <div className="space-y-12">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="semi-condensed text-2xl font-bold text-cordovan-900">{s.title}</h2>
                <ul className="mt-4 space-y-3 text-[1.05rem] leading-relaxed text-ink-soft">
                  {s.body.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-brass-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
