/**
 * `Cita.inicio`/`fin` llegan del backend como instantes UTC reales
 * (columna `DateTime(timezone=True)`), correctamente convertidos desde
 * la hora local que el profesional eligió al crear la cita. Mostrarlos
 * forzando `timeZone: 'UTC'` (como hacía este archivo antes) le resta
 * el offset local a la hora real de la cita -- eso hacía que HealthStaff
 * mostrara una hora distinta a Lumora para la MISMA cita (ej. 10:15 p.m.
 * acá vs. 2:45 p.m. en Lumora). No se especifica `timeZone` para que
 * ambas apps usen la zona horaria real del dispositivo, igual que
 * `formatAppointmentTime` en Lumora.
 */
export function formatWorkspaceDateTime(value: string | null | undefined) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatWorkspaceTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}