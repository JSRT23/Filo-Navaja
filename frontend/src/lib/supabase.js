import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true cuando el .env tiene las llaves del proyecto */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Realtime se puede apagar (VITE_ENABLE_REALTIME=false) en entornos sin websocket */
export const realtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME !== 'false';

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'filo-navaja-auth',
  },
  global: { headers: { 'x-client-info': 'filo-navaja-web/1.0' } },
});

/** Lanza el error de Supabase o devuelve los datos */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/** Llama una función RPC y devuelve sus datos */
export async function rpc(fn, args) {
  return unwrap(await supabase.rpc(fn, args));
}

/** URL pública de un archivo en Storage */
export function publicUrl(bucket, path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Invoca una Edge Function y lanza un Error con el mensaje que devuelve la función */
export async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) {
        const d = payload.details;
        message = Array.isArray(d) ? d.join('. ') : d ? `${payload.error}: ${d}` : payload.error;
      }
    } catch {
      /* respuesta sin JSON */
    }
    if (/failed to send a request|fetch/i.test(message))
      message = 'No se pudo contactar la función del servidor. Verifica que esté desplegada.';
    throw new Error(message);
  }
  return data;
}
