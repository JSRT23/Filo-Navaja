// Traduce errores de Supabase a mensajes claros para la persona que usa la app.
const AUTH_MESSAGES = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.'],
  [
    /user already registered|already been registered|user_already_exists/i,
    'Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.',
  ],
  [/password should be at least|weak_password/i, 'La contraseña debe tener al menos 8 caracteres, con letras y números.'],
  [/rate limit|too many requests|over_email_send_rate_limit/i, 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.'],
  [/unable to validate email|invalid email/i, 'Escribe un correo válido.'],
  [/new password should be different/i, 'La nueva contraseña debe ser distinta a la anterior.'],
  [/jwt expired|invalid jwt|refresh token/i, 'Tu sesión venció. Ingresa de nuevo.'],
  [/failed to fetch|networkerror|load failed/i, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'],
];

export function errorMessage(error, fallback = 'Algo salió mal. Inténtalo de nuevo.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const msg = error.message || error.error_description || error.msg || '';
  for (const [re, text] of AUTH_MESSAGES) if (re.test(msg) || re.test(error.code || '')) return text;

  // Los RPC del backend ya lanzan mensajes en español (código P0001, 22023, 42501…)
  if (msg && /[áéíóúñ¿]|^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ /.test(msg) && !/^(new row|permission|duplicate|violates)/i.test(msg)) {
    return msg;
  }
  if (error.code === '42501' || /permission denied|row-level security/i.test(msg)) {
    return 'No tienes permiso para hacer esto con tu rol actual.';
  }
  if (error.code === '23505' || /duplicate key/i.test(msg)) return 'Ya existe un registro con esos datos.';
  if (error.code === '23503') return 'No se puede completar porque otro registro depende de este.';
  if (error.code === '23514') return 'Algún dato no cumple las reglas del negocio. Revisa los valores.';
  if (error.code === 'PGRST116') return 'No encontramos el registro.';
  return msg || fallback;
}
