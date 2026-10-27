import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

export function AccountNav() {
  return (
    <nav aria-label="Mi cuenta" className="flex gap-1">
      {[
        ['/mi-cuenta', 'Mis citas'],
        ['/mi-cuenta/perfil', 'Mi perfil'],
      ].map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              'rounded-sm px-3.5 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-bone-50 text-onyx-900' : 'text-bone-100/75 hover:bg-bone-100/10 hover:text-bone-50',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
