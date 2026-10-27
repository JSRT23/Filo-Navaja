import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '@/lib/supabase';
import { AuthContext } from './context';

async function fetchMe(userId) {
  const profile = unwrap(await supabase.from('profiles').select('*, branch:branches(id, name, slug)').eq('id', userId).single());
  let barber = null;
  let customer = null;
  if (profile.role === 'barber') {
    barber = unwrap(await supabase.from('barbers').select('*').eq('profile_id', userId).maybeSingle());
  }
  if (profile.role === 'client') {
    customer = unwrap(await supabase.from('customers').select('*').eq('profile_id', userId).maybeSingle());
  }
  return { profile, barber, customer };
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    // No se llama a Supabase dentro del callback: solo se actualiza el estado.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        setRecovering(false);
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'public' });
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [qc]);

  const userId = session?.user?.id;
  const me = useQuery({
    queryKey: ['me', userId],
    queryFn: () => fetchMe(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone?.trim() || null, data_consent: true },
        emailRedirectTo: `${window.location.origin}/mi-cuenta`,
      },
    });
    if (error) throw error;
    return data; // data.session es null si el proyecto exige confirmar el correo
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['me'] }), [qc]);

  const value = useMemo(() => {
    const profile = me.data?.profile ?? null;
    const role = profile?.role ?? null;
    return {
      ready,
      session,
      user: session?.user ?? null,
      profile,
      barber: me.data?.barber ?? null,
      customer: me.data?.customer ?? null,
      role,
      isStaff: role === 'admin' || role === 'receptionist' || role === 'barber',
      isAdmin: role === 'admin',
      isFrontDesk: role === 'admin' || role === 'receptionist',
      // Cargando: sesión sin resolver o perfil aún no disponible
      loading: !ready || (Boolean(userId) && me.isPending),
      profileError: me.error,
      recovering,
      setRecovering,
      signIn,
      signUp,
      signOut,
      refresh,
    };
  }, [ready, session, me.data, me.isPending, me.error, userId, recovering, signIn, signUp, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
