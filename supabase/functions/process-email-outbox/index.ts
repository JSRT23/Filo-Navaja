// =====================================================================
// process-email-outbox
// Envía los correos pendientes de public.email_outbox usando Resend.
// La invoca pg_cron cada 2 minutos (ver migración 1000).
//
// Seguridad: verify_jwt = false en config.toml; se protege con el secreto
// "cron_secret" de Vault, que valida public.verify_cron_secret().
//
// Secretos de la función (supabase secrets set …):
//   RESEND_API_KEY  clave de https://resend.com (si falta, modo prueba: solo registra)
//   EMAIL_FROM      "Filo & Navaja <citas@tudominio.com>" (dominio verificado en Resend)
//   APP_URL         URL pública del frontend, p. ej. https://filoynavaja.co
// =====================================================================
import { adminClient } from '../_shared/supabase.ts';
import { error, guardMethod, json, safeEqual } from '../_shared/http.ts';
import { renderAppointmentEmail, type AppointmentPayload, type EmailTemplate } from '../_shared/email-templates.ts';

interface OutboxRow {
  id: string;
  template: EmailTemplate;
  to_email: string;
  to_name: string | null;
  payload: AppointmentPayload;
  attempts: number;
}

const BATCH_SIZE = 25;

async function sendWithResend(to: string, subject: string, html: string, text: string): Promise<string> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`[modo prueba] correo a ${to}: ${subject}`);
    return 'dry-run';
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? 'Filo & Navaja <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body?.message ?? JSON.stringify(body)}`);
  return body.id as string;
}

Deno.serve(async (req) => {
  const early = guardMethod(req);
  if (early) return early;

  const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const admin = adminClient();

  // El secreto vive en Vault ("cron_secret"). CRON_SECRET en el entorno es opcional.
  const envSecret = Deno.env.get('CRON_SECRET');
  let authorized = false;
  if (envSecret) {
    authorized = safeEqual(provided, envSecret);
  } else if (provided) {
    const { data } = await admin.rpc('verify_cron_secret', { p_token: provided });
    authorized = data === true;
  }
  if (!authorized) return error(401, 'No autorizado');
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

  const { data: batch, error: claimError } = await admin.rpc('claim_email_batch', { p_limit: BATCH_SIZE });
  if (claimError) return error(500, 'No se pudo leer la bandeja', claimError.message);

  let sent = 0;
  let failed = 0;
  for (const row of (batch ?? []) as OutboxRow[]) {
    try {
      const email = renderAppointmentEmail(row.template, row.payload, appUrl);
      const providerId = await sendWithResend(row.to_email, email.subject, email.html, email.text);
      await admin.rpc('complete_email', { p_id: row.id, p_success: true, p_provider_message_id: providerId });
      sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Error enviando ${row.id}: ${message}`);
      await admin.rpc('complete_email', { p_id: row.id, p_success: false, p_error: message });
      failed++;
    }
  }

  return json({ processed: (batch ?? []).length, sent, failed });
});
