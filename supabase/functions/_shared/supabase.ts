// Clientes de Supabase para las Edge Functions.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export type AppRole = 'admin' | 'receptionist' | 'barber' | 'client';

export interface Caller {
  user: User;
  profile: { id: string; role: AppRole; branch_id: string | null; is_active: boolean; full_name: string };
}

/** Cliente con service_role: salta la RLS. Úsalo solo después de autorizar. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Identifica al usuario que llama a partir de su JWT. */
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, branch_id, is_active, full_name')
    .eq('id', data.user.id)
    .single();

  if (!profile || !profile.is_active) return null;
  return { user: data.user, profile: profile as Caller['profile'] };
}
