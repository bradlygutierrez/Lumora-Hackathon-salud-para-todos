/**
 * Formatea un Date como "10:00 AM" (12h, en-US) -- mismo estilo que
 * muestra el Figma de Recordatorios. Se usa 'en-US' explícito (no
 * 'es-NI') porque el AM/PM de esa locale varía entre entornos
 * ("PM" vs "p. m."), lo que ya causó tests inconsistentes en
 * Notificaciones (A09) -- ver format-relative-time.ts.
 */
export function formatItemTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formatea un Date como "HH:MM" (24h, hora local) -- el formato que
 * espera el campo "Hora" del formulario de Nuevo/Editar Recordatorio.
 */
export function formatLocalHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
