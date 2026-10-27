// Plantillas de correo con la identidad de Filo & Navaja.
// Diseño en tablas e estilos en línea para que se vea bien en Gmail y Outlook.

export type EmailTemplate =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'booking_rescheduled';

export interface AppointmentPayload {
  appointment_id: string;
  customer_name: string;
  service_name: string;
  duration_minutes: number;
  barber_name: string;
  branch_name: string;
  branch_address: string;
  branch_phone: string | null;
  starts_at: string;
  ends_at: string;
  price: number;
  timezone: string;
  cancellation_reason: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = {
  name: 'Filo & Navaja',
  ink: '#0E0E0E',
  paper: '#F6F1E7',
  gold: '#C8A96A',
  muted: '#8A8172',
};

const escape = (v: unknown) =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function formatDate(iso: string, tz: string): string {
  const text = new Intl.DateTimeFormat('es-CO', {
    timeZone: tz || 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const COPY: Record<EmailTemplate, { subject: (p: AppointmentPayload, when: string) => string; title: string; intro: string }> = {
  booking_confirmation: {
    subject: (_p, when) => `Tu cita está confirmada · ${when}`,
    title: 'Tu silla está reservada',
    intro: 'Te esperamos. Llega 5 minutos antes para empezar a tiempo.',
  },
  booking_reminder: {
    subject: (_p, when) => `Recordatorio: tu cita es ${when}`,
    title: 'Nos vemos pronto',
    intro: 'Este es un recordatorio de tu próxima cita. Si no puedes asistir, cancélala desde la app para liberar el espacio.',
  },
  booking_cancelled: {
    subject: () => 'Tu cita fue cancelada',
    title: 'Cita cancelada',
    intro: 'Tu cita quedó cancelada. Cuando quieras, reserva un nuevo horario desde la app.',
  },
  booking_rescheduled: {
    subject: (_p, when) => `Tu cita cambió de horario · ${when}`,
    title: 'Nuevo horario confirmado',
    intro: 'Actualizamos tu cita. Estos son los nuevos detalles.',
  },
};

export function renderAppointmentEmail(template: EmailTemplate, p: AppointmentPayload, appUrl: string): RenderedEmail {
  const copy = COPY[template];
  const when = formatDate(p.starts_at, p.timezone);
  const firstName = (p.customer_name || '').split(' ')[0] || 'Hola';
  const rows: [string, string][] = [
    ['Servicio', `${p.service_name} · ${p.duration_minutes} min`],
    ['Fecha y hora', when],
    ['Barbero', p.barber_name],
    ['Sede', `${p.branch_name} · ${p.branch_address}`],
    ['Valor', formatCOP(Number(p.price))],
  ];
  if (template === 'booking_cancelled' && p.cancellation_reason) rows.push(['Motivo', p.cancellation_reason]);

  const detailRows = rows
    .map(([k, v]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2A2722;color:${BRAND.muted};font-size:13px;width:130px;">${escape(k)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #2A2722;color:${BRAND.paper};font-size:15px;">${escape(v)}</td>
      </tr>`)
    .join('');

  const cta = template === 'booking_cancelled' ? 'Reservar de nuevo' : 'Ver mis citas';
  const ctaUrl = `${appUrl.replace(/\/$/, '')}${template === 'booking_cancelled' ? '/reservar' : '/mis-citas'}`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(copy.subject(p, when))}</title></head>
<body style="margin:0;padding:0;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.ink};border:1px solid #2A2722;">
      <tr><td style="padding:28px 32px;border-bottom:1px solid ${BRAND.gold};">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:4px;color:${BRAND.gold};text-transform:uppercase;">${BRAND.name}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:${BRAND.muted};text-transform:uppercase;margin-top:4px;">Barbería · Montería</div>
      </td></tr>
      <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;color:${BRAND.paper};">${escape(copy.title)}</h1>
        <p style="margin:0 0 24px;color:#CFC6B5;font-size:15px;line-height:1.6;">${escape(firstName)}, ${escape(copy.intro.charAt(0).toLowerCase() + copy.intro.slice(1))}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background:${BRAND.gold};">
          <a href="${escape(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.ink};text-decoration:none;font-weight:bold;">${cta}</a>
        </td></tr></table>
        ${p.branch_phone ? `<p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">¿Dudas? Escríbenos al ${escape(p.branch_phone)}.</p>` : ''}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #2A2722;font-family:Arial,sans-serif;font-size:11px;color:${BRAND.muted};line-height:1.6;">
        Recibes este correo porque tienes una cita en ${BRAND.name}. Tratamos tus datos según nuestra política de tratamiento de datos personales (Ley 1581 de 2012).
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `${BRAND.name} · ${copy.title}`,
    '',
    `${firstName}, ${copy.intro.charAt(0).toLowerCase() + copy.intro.slice(1)}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `${cta}: ${ctaUrl}`,
  ].join('\n');

  return { subject: copy.subject(p, when), html, text };
}
