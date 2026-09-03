const WORKSPACE_TIME_ZONE = 'UTC';

export function formatWorkspaceDateTime(value: string | null | undefined) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: WORKSPACE_TIME_ZONE,
  }).format(new Date(value));
}

export function formatWorkspaceTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WORKSPACE_TIME_ZONE,
  }).format(new Date(value));
}