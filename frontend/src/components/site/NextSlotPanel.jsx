import { Link } from 'react-router-dom';
import { useNextFreeSlot } from '@/api/booking';
import { firstName, relativeDay, time } from '@/lib/format';
import { Skeleton } from '@/components/ui/Feedback';
import { shortBranch } from './Branches';

function Row({ branch, service }) {
  const { data, isPending, isError } = useNextFreeSlot(branch.id, service?.id);
  const params = new URLSearchParams({ sede: branch.slug, servicio: service?.slug ?? '' });
  if (data) {
    params.set('barbero', data.barber_id);
    params.set('fecha', data.date);
    params.set('hora', data.slot_start);
  }
  return (
    <li>
      <Link
        to={`/reservar?${params}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 rounded-md px-4 py-3.5 transition-colors hover:bg-bone-100/[0.07]"
      >
        <span className="text-sm text-bone-100/65">{shortBranch(branch.name)}</span>
        <span className="row-span-2 rounded-sm border border-gold-400/50 px-2.5 py-1 text-xs font-semibold text-gold-300 transition-colors group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-onyx-950">
          Tomarlo
        </span>
        {isPending ? (
          <Skeleton dark className="mt-1 h-6 w-44" />
        ) : isError || !data ? (
          <span className="font-semibold text-bone-50">Sin turnos esta semana</span>
        ) : (
          <span className="font-semibold text-bone-50">
            {relativeDay(data.date)}, {time(data.slot_start)}
            <span className="font-normal text-bone-100/65"> con {firstName(data.barber_name)}</span>
          </span>
        )}
      </Link>
    </li>
  );
}

/** Próximo turno libre por sede, en vivo desde la disponibilidad real */
export function NextSlotPanel({ branches = [], service }) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-bone-100/12 bg-onyx-950/70 p-2 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <p className="text-sm font-semibold text-bone-50">Próximo turno libre</p>
        {service && <p className="text-xs text-bone-100/55">{service.name}</p>}
      </div>
      <ul>
        {branches.map((b) => (
          <Row key={b.id} branch={b} service={service} />
        ))}
      </ul>
    </div>
  );
}
