import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PageLoader } from '@/components/ui/Feedback';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SetupNotice } from '@/pages/SetupNotice';
import Home from '@/pages/public/Home';

// Sitio público
const Services = lazy(() => import('@/pages/public/Services'));
const Barbers = lazy(() => import('@/pages/public/Barbers'));
const Products = lazy(() => import('@/pages/public/Products'));
const Branches = lazy(() => import('@/pages/public/Branches'));
const Privacy = lazy(() => import('@/pages/public/Privacy'));
const NotFound = lazy(() => import('@/pages/public/NotFound'));
const Booking = lazy(() => import('@/features/booking/BookingPage'));

// Cuenta
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const Recover = lazy(() => import('@/pages/auth/Recover'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const MyAppointments = lazy(() => import('@/pages/account/MyAppointments'));
const Profile = lazy(() => import('@/pages/account/Profile'));

// Panel del personal
const PanelLayout = lazy(() => import('@/components/layout/PanelLayout'));
const PanelHome = lazy(() => import('@/pages/panel/PanelHome'));
const Agenda = lazy(() => import('@/pages/panel/agenda/Agenda'));
const Checkout = lazy(() => import('@/pages/panel/checkout/Checkout'));
const Inventory = lazy(() => import('@/pages/panel/Inventory'));
const Customers = lazy(() => import('@/pages/panel/Customers'));
const Commissions = lazy(() => import('@/pages/panel/Commissions'));
const Attendance = lazy(() => import('@/pages/panel/Attendance'));
const Catalog = lazy(() => import('@/pages/panel/Catalog'));
const Staff = lazy(() => import('@/pages/panel/staff/Staff'));
const Settings = lazy(() => import('@/pages/panel/Settings'));
const MyBarberProfile = lazy(() => import('@/pages/panel/MyBarberProfile'));
const Kiosk = lazy(() => import('@/pages/kiosk/Kiosk'));

const STAFF = ['admin', 'receptionist', 'barber'];
const FRONT = ['admin', 'receptionist'];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="servicios" element={<Services />} />
            <Route path="barberos" element={<Barbers />} />
            <Route path="productos" element={<Products />} />
            <Route path="sedes" element={<Branches />} />
            <Route path="reservar" element={<Booking />} />
            <Route path="privacidad" element={<Privacy />} />
            <Route element={<RequireAuth roles={['client']} />}>
              <Route path="mi-cuenta" element={<MyAppointments />} />
              <Route path="mi-cuenta/perfil" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="ingresar" element={<Login />} />
            <Route path="registro" element={<Register />} />
            <Route path="recuperar" element={<Recover />} />
            <Route path="restablecer" element={<ResetPassword />} />
          </Route>

          <Route element={<RequireAuth roles={STAFF} />}>
            <Route path="panel" element={<PanelLayout />}>
              <Route index element={<PanelHome />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="comisiones" element={<Commissions />} />
              <Route path="asistencia" element={<Attendance />} />
              <Route element={<RequireAuth roles={FRONT} />}>
                <Route path="caja" element={<Checkout />} />
                <Route path="inventario" element={<Inventory />} />
                <Route path="clientes" element={<Customers />} />
              </Route>
              <Route element={<RequireAuth roles={['admin']} />}>
                <Route path="catalogo" element={<Catalog />} />
                <Route path="personal" element={<Staff />} />
                <Route path="configuracion" element={<Settings />} />
              </Route>
              <Route element={<RequireAuth roles={['barber']} />}>
                <Route path="mi-perfil" element={<MyBarberProfile />} />
              </Route>
              <Route path="*" element={<Navigate to="/panel" replace />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={FRONT} />}>
            <Route path="kiosco" element={<Kiosk />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
