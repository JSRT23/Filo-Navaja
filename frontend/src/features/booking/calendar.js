// Enlace para agregar la cita a Google Calendar
const stamp = (iso) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

export function googleCalendarUrl({ title, start, end, details, location }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: details || '',
    location: location || '',
    ctz: 'America/Bogota',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
