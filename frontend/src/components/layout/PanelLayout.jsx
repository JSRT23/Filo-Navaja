import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  ExternalLink,
  Fingerprint,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ScissorsLineDashed,
  Settings,
  UserRoundCog,
  UserSquare2,
  Users,
  Clock4,
} from 'lucide-react';
import { useBranches } from '@/api/catalog';
import { useAuth } from '@/features/auth/context';
import { PanelContext, usePanel } from '@/features/panel/context';
import { ROLE_LABEL } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { publicUrl } from '@/lib/supabase';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Feedback';
import { shortBranch } from '@/components/site/Branches';

const BRANCH_KEY = 'filo-navaja-panel-branch';

function navFor(role) {
  if (role === 'barber') {
    return [
      {
        title: null,
        items: [
          { to: '/panel/agenda', label: 'Mi agenda', icon: CalendarDays },
          { to: '/panel/comisiones', label: 'Mis comisiones', icon: HandCoins },
          { to: '/panel/asistencia', label: 'Mi asistencia', icon: Clock4 },
          { to: '/panel/mi-perfil', label: 'Mi perfil', icon: UserSquare2 },
        ],
      },
    ];
  }
  const groups = [
    {
      title: 'Día a día',
      items: [
        { to: '/panel', label: 'Resumen', icon: LayoutDashboard, end: true },
        { to: '/panel/agenda', label: 'Agenda', icon: CalendarDays },
        { to: '/panel/caja', label: 'Caja', icon: BadgeDollarSign },
        { to: '/kiosco', label: 'Kiosco de asistencia', icon: Fingerprint, external: true },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { to: '/panel/clientes', label: 'Clientes', icon: Users },
        { to: '/panel/inventario', label: 'Inventario', icon: Boxes },
        { to: '/panel/asistencia', label: 'Asistencia', icon: Clock4 },
      ],
    },
  ];
  if (role === 'admin') {
    groups[1].items.push({ to: '/panel/comisiones', label: 'Comisiones', icon: HandCoins });
    groups.push({
      title: 'Administración',
      items: [
        { to: '/panel/catalogo', label: 'Servicios y productos', icon: ScissorsLineDashed },
        { to: '/panel/personal', label: 'Personal', icon: UserRoundCog },
        { to: '/panel/configuracion', label: 'Configuración', icon: Settings },
      ],
    });
  }
  return groups;
}

function SidebarContent({ onNavigate }) {
  const { profile, role, signOut, isAdmin } = useAuth();
  const { branches, branchId, setBranchId } = usePanel();
  const navigate = useNavigate();
  const groups = navFor(role);

  return (
    <div className="flex h-full flex-col bg-onyx-950 text-bone-100">
      <div className="px-5 pb-4 pt-5">
        <Logo to="/panel" />
      </div>

      <div className="px-4 pb-2">
        {isAdmin ? (
          <label className="block">
            <span className="sr-only">Sede</span>
            <select
              value={branchId ?? ''}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-md border border-bone-100/12 bg-onyx-900 px-3 text-sm font-medium text-bone-50 focus:border-gold-400 focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Sede {shortBranch(b.name)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-md border border-bone-100/10 bg-onyx-900 px-3 py-2 text-sm font-medium text-bone-50">
            Sede {shortBranch(branches.find((b) => b.id === branchId)?.name ?? '')}
          </p>
        )}
      </div>

      <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.title ?? 'main'} className="mb-5">
            {g.title && <p className="px-3 pb-1.5 text-xs font-medium text-bone-100/40">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-[0.92rem] font-medium transition-colors',
                        isActive && !item.external
                          ? 'bg-bone-50 text-onyx-900'
                          : 'text-bone-100/75 hover:bg-bone-100/[0.07] hover:text-bone-50',
                      )
                    }
                  >
                    <item.icon className="size-[1.1rem] shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.external && <ExternalLink className="size-3.5 opacity-50" aria-hidden />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-bone-100/10 p-3">
        <Link
          to="/"
          className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-bone-100/60 hover:bg-bone-100/[0.07] hover:text-bone-50"
        >
          <ExternalLink className="size-4" aria-hidden /> Ver el sitio público
        </Link>
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar name={profile?.full_name} src={publicUrl('avatars', profile?.avatar_url)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-bone-50">{profile?.full_name}</p>
            <p className="text-xs text-bone-100/50">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/ingresar');
            }}
            className="grid size-9 place-items-center rounded-sm text-bone-100/60 hover:bg-bone-100/10 hover:text-bone-50"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PanelLayout() {
  const { profile, barber, role } = useAuth();
  const { data: branches = [] } = useBranches();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminBranch, setAdminBranch] = useState(() => {
    try {
      return localStorage.getItem(BRANCH_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => setMobileOpen(false), [pathname]);

  const fixedBranch = role === 'barber' ? barber?.branch_id : role === 'receptionist' ? profile?.branch_id : null;
  const branchId = fixedBranch ?? (branches.some((b) => b.id === adminBranch) ? adminBranch : (branches[0]?.id ?? null));

  const value = useMemo(
    () => ({
      branches,
      branchId,
      branch: branches.find((b) => b.id === branchId) ?? null,
      setBranchId: (id) => {
        setAdminBranch(id);
        try {
          localStorage.setItem(BRANCH_KEY, id);
        } catch {
          /* sin almacenamiento local: se mantiene en memoria */
        }
      },
    }),
    [branches, branchId],
  );

  return (
    <PanelContext.Provider value={value}>
      <div className="min-h-dvh bg-paper">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
          <SidebarContent />
        </aside>

        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-sm text-ink hover:bg-paper"
            aria-label="Abrir menú del panel"
          >
            <MenuIcon className="size-5" />
          </button>
          <div style={{ '--logo-pin': '#f8f4ee' }}>
            <Logo to="/panel" tone="dark" />
          </div>
          <span className="size-10" />
        </div>

        <Drawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          side="left"
          title="Menú"
          width="max-w-xs"
          className="bg-onyx-950 [&>div:first-child]:hidden"
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        <main id="contenido" className="lg:pl-64">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            {branchId ? (
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            ) : (
              <PageLoader label="Cargando sedes…" />
            )}
          </div>
        </main>
      </div>
    </PanelContext.Provider>
  );
}
