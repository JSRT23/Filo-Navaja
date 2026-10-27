// =====================================================================
// delete-my-account
// Derecho de supresión (Ley 1581 de 2012): el cliente elimina su cuenta.
// Se anonimizan sus datos, se cancelan sus citas futuras, se borra su foto
// y su usuario de Auth. Las ventas se conservan como "Cliente anónimo".
//
// POST /functions/v1/delete-my-account  (Authorization: Bearer <JWT del cliente>)
// { "confirm": "ELIMINAR" }
// =====================================================================
import { adminClient, getCaller } from '../_shared/supabase.ts';
import { error, guardMethod, json, readJson } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = guardMethod(req);
  if (early) return early;

  const admin = adminClient();
  const caller = await getCaller(req, admin);
  if (!caller) return error(401, 'Sesión inválida o expirada');
  if (caller.profile.role !== 'client') {
    return error(403, 'Las cuentas del personal las desactiva un administrador');
  }

  const body = await readJson<{ confirm?: string }>(req);
  if (body?.confirm !== 'ELIMINAR') {
    return error(422, 'Para confirmar envía { "confirm": "ELIMINAR" }');
  }

  const userId = caller.user.id;

  const { data: customer } = await admin.from('customers').select('id').eq('profile_id', userId).maybeSingle();
  if (customer) {
    const { error: anonError } = await admin.rpc('anonymize_customer', { p_customer_id: customer.id });
    if (anonError) return error(500, 'No se pudieron suprimir los datos', anonError.message);
  }

  // Foto de perfil
  const { data: files } = await admin.storage.from('avatars').list(userId);
  if (files?.length) {
    await admin.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return error(500, 'No se pudo eliminar el usuario', deleteError.message);

  return json({ ok: true, message: 'Tu cuenta y tus datos personales fueron eliminados' });
});
