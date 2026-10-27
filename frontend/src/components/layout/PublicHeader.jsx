import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, LayoutDashboard, LogOut, Menu as MenuIcon, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/Menu';
import { useAuth, homeForRole } from '@/features/auth/context';
import { ROLE_LABEL } from '@/lib/constants';
import { publicUrl } from '@/lib/supabase';

const NAV = [
  { to: '/servicios', label: 'Servicios' },
  { to: '/barberos', label: 'Barberos' },
  { to: '/productos', label: 'Productos' },
  { to: '/sedes', label: 'Sedes' },
];

export function PublicHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut, isStaff } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = pathname === '/' && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        overHero ? 'bg-transparent' : 'bg-onyx-950/92 shadow-[0_1px_0_rgb(237_229_216/0.08)] backdrop-blur-md',
      )}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-onyx-950"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:h-18 sm:px-8">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative rounded-sm px-3.5 py-2 text-[0.95rem] font-medium transition-colors',
                  isActive ? 'text-bone-50' : 'text-bone-100/70 hover:text-bone-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span layoutId="nav-underline" className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-gold-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Menu
              trigger={
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-bone-100/85 transition-colors hover:bg-bone-100/10 hover:text-bone-50 sm:flex"
                >
                  <Avatar name={profile?.full_name || user.email} src={publicUrl('avatars', profile?.avatar_url)} size="xs" />
                  <span className="max-w-32 truncate">{profile?.full_name?.split(' ')[0] || 'Mi cuenta'}</span>
                </button>
              }
            >
              <MenuLabel>
                {profile?.full_name || user.email}
                {role && <span className="block text-ink-mute">{ROLE_LABEL[role]}</span>}
              </MenuLabel>
              <MenuSeparator />
              {isStaff ? (
                <MenuItem icon={LayoutDashboard} onSelect={() => navigate(homeForRole(role))}>
                  Ir al panel
                </MenuItem>
              ) : (
                <>
                  <MenuItem icon={CalendarDays} onSelect={() => navigate('/mi-cuenta')}>
                    Mis citas
                  </MenuItem>
                  <MenuItem icon={UserRound} onSelect={() => navigate('/mi-cuenta/perfil')}>
                    Mi perfil
                  </MenuItem>
                </>
              )}
              <MenuSeparator />
              <MenuItem icon={LogOut} onSelect={handleSignOut}>
                Cerrar sesión
              </MenuItem>
            </Menu>
          ) : (
            <Link
              to="/ingresar"
              className="hidden rounded-sm px-3 py-2 text-[0.95rem] font-medium text-bone-100/80 transition-colors hover:text-bone-50 sm:block"
            >
              Ingresar
            </Link>
          )}
          <Button to="/reservar" size="sm" className="hidden sm:inline-flex">
            Reservar turno
          </Button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-sm text-bone-50 hover:bg-bone-100/10 md:hidden"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <MenuIcon className="size-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-onyx-950 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-sm text-bone-50 hover:bg-bone-100/10"
                aria-label="Cerrar menú"
              >
                <X className="size-6" />
              </button>
            </div>
            <nav aria-label="Móvil" className="flex flex-1 flex-col justify-center gap-1 px-6">
              {[{ to: '/', label: 'Inicio' }, ...NAV].map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i + 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink
                    to={item.to}
                    end
                    className={({ isActive }) => cn('display block py-1.5 text-6xl', isActive ? 'text-gold-400' : 'text-bone-50')}
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="grid gap-3 border-t border-bone-100/10 p-6">
              <Button to="/reservar" size="lg">
                Reservar turno
              </Button>
              {user ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button to={isStaff ? homeForRole(role) : '/mi-cuenta'} variant="light">
                    {isStaff ? 'Ir al panel' : 'Mis citas'}
                  </Button>
                  <Button variant="light" onClick={handleSignOut}>
                    Cerrar sesión
                  </Button>
                </div>
              ) : (
                <Button to="/ingresar" variant="light">
                  Ingresar
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
