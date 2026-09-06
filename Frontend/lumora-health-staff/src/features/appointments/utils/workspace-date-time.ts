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
/**
 * `timeZone` solo existe para que las pruebas puedan fijar una zona
 * determinística sin depender de reasignar `process.env.TZ` en tiempo de
 * ejecución -- eso resultó no ser confiable entre plataformas (funcionaba
 * en Windows pero no en el runner de CI). Los llamadores reales nunca lo
 * pasan, así que siguen usando la zona horaria real del dispositivo.
 */
export function formatWorkspaceDateTime(value: string | null | undefined, timeZone?: string) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

export function formatWorkspaceTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}