// =====================================================================
// admin-create-staff
// Un administrador crea una cuenta de personal (admin, recepción o barbero).
// Si es barbero, también crea su ficha, sus servicios y su PIN de kiosco.
//
// POST /functions/v1/admin-create-staff   (Authorization: Bearer <JWT del admin>)
// {
//   "email": "nuevo@filoynavaja.co",
//   "password": "Temporal2026!",
//   "full_name": "Nombre Apellido",
//   "phone": "3001234567",
//   "role": "barber",                    // admin | receptionist | barber
//   "branch_id": "<uuid de la sede>",    // obligatorio salvo para admin
//   "barber": {                          // solo si role = barber
//     "display_name": "Nombre",
//     "bio": "…",
//     "specialties": ["Fade", "Barba"],
//     "service_ids": ["<uuid>", "…"],    // si se omite, todos los servicios activos
//     "calendar_color": "#C8A96A",
//     "pin": "4826"
//   }
// }
// =====================================================================
import { adminClient, getCaller, type AppRole } from '../_shared/supabase.ts';
import { error, guardMethod, json, readJson } from '../_shared/http.ts';

interface Body {
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role?: AppRole;
  branch_id?: string;
  barber?: {
    display_name?: string;
    bio?: string;
    specialties?: string[];
    service_ids?: string[];
    calendar_color?: string;
    pin?: string;
  };
}

const STAFF_ROLES: AppRole[] = ['admin', 'receptionist', 'barber'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(b: Body | null): string[] {
  const errors: string[] = [];
  if (!b) return ['El cuerpo debe ser JSON'];
  if (!b.email || !EMAIL_RE.test(b.email)) errors.push('Correo inválido');
  if (!b.password || b.password.length < 8) errors.push('La contraseña temporal debe tener mínimo 8 caracteres');
  if (!b.full_name || b.full_name.trim().length < 3) errors.push('El nombre completo es obligatorio');
  if (!b.role || !STAFF_ROLES.includes(b.role)) errors.push('Rol inválido (admin, receptionist o barber)');
  if (b.role !== 'admin' && (!b.branch_id || !UUID_RE.test(b.branch_id))) errors.push('La sede es obligatoria');
  if (b.barber?.pin && !/^[0-9]{4,6}$/.test(b.barber.pin)) errors.push('El PIN debe tener entre 4 y 6 dígitos');
  if (b.barber?.calendar_color && !/^#[0-9A-Fa-f]{6}$/.test(b.barber.calendar_color)) errors.push('Color inválido');
  return errors;
}

Deno.serve(async (req) => {
  const early = guardMethod(req);
  if (early) return early;

  const admin = adminClient();
  const caller = await getCaller(req, admin);
  if (!caller) return error(401, 'Sesión inválida o expirada');
  if (caller.profile.role !== 'admin') return error(403, 'Solo un administrador puede crear personal');

  const body = await readJson<Body>(req);
  const problems = validate(body);
  if (problems.length) return error(422, 'Datos inválidos', problems);
  const b = body!;
  const branchId = b.role === 'admin' ? null : b.branch_id!;

  if (branchId) {
    const { data: branch } = await admin.from('branches').select('id').eq('id', branchId).maybeSingle();
    if (!branch) return error(422, 'La sede no existe');
  }

  // 1. Cuenta de Auth. El rol viaja en app_metadata (el usuario no puede editarlo).
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: b.email!.trim().toLowerCase(),
    password: b.password!,
    email_confirm: true,
    user_metadata: { full_name: b.full_name!.trim(), phone: b.phone ?? null },
    app_metadata: { role: b.role, branch_id: branchId },
  });
  if (authError || !created.user) {
    const msg = authError?.message?.includes('already') ? 'Ya existe un usuario con ese correo' : authError?.message;
    return error(409, msg ?? 'No se pudo crear el usuario');
  }
  const userId = created.user.id;

  // 2. Ficha de barbero. Si algo falla se borra la cuenta (no quedan usuarios a medias).
  let barberId: string | null = null;
  if (b.role === 'barber') {
    try {
      const { data: barber, error: barberError } = await admin
        .from('barbers')
        .insert({
          profile_id: userId,
          branch_id: branchId,
          display_name: b.barber?.display_name?.trim() || b.full_name!.trim(),
          bio: b.barber?.bio ?? null,
          specialties: b.barber?.specialties ?? [],
          calendar_color: b.barber?.calendar_color ?? '#C8A96A',
          hired_on: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (barberError) throw barberError;
      barberId = barber.id;

      let serviceIds = b.barber?.service_ids;
      if (!serviceIds?.length) {
        const { data: services, error: sErr } = await admin.from('services').select('id').eq('is_active', true);
        if (sErr) throw sErr;
        serviceIds = (services ?? []).map((s) => s.id);
      }
      if (serviceIds.length) {
        const { error: bsErr } = await admin
          .from('barber_services')
          .insert(serviceIds.map((service_id) => ({ barber_id: barberId, service_id })));
        if (bsErr) throw bsErr;
      }

      if (b.barber?.pin) {
        const { error: pinErr } = await admin.rpc('set_barber_pin', { p_barber_id: barberId, p_pin: b.barber.pin });
        if (pinErr) throw pinErr;
      }
    } catch (e) {
      await admin.auth.admin.deleteUser(userId);
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
      return error(422, 'No se pudo crear la ficha del barbero', message);
    }
  }

  return json({ user_id: userId, barber_id: barberId, role: b.role, branch_id: branchId }, 201);
});
