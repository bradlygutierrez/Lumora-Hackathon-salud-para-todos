export function formatRelativeTime(iso: string): string {
  const fecha = new Date(iso);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  const esMismoDia = fecha.toDateString() === ahora.toDateString();
  if (esMismoDia) {
    return `Hace ${diffHoras} hora${diffHoras === 1 ? '' : 's'}`;
  }

  const hora = new Intl.DateTimeFormat('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(fecha);

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) {
    return `Ayer, ${hora}`;
  }

  const diaSemana = new Intl.DateTimeFormat('es-NI', { weekday: 'short' }).format(fecha);
  const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${diaCapitalizado}, ${hora}`;
}
