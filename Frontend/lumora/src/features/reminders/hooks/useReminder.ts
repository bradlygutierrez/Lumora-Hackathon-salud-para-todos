import { useQuery } from '@tanstack/react-query';

import { remindersApi } from '@/features/reminders/api/reminders-api';

/**
 * GET /reminders/recordatorios/{id} -- un recordatorio puntual, usado por
 * la pantalla "Nuevo Recordatorio" cuando entra en modo edición (botón
 * "Editar" de un recordatorio de Seguimiento en el tablero).
 */
export function useReminder(id: number | undefined) {
  return useQuery({
    queryKey: ['reminder', id],
    queryFn: () => remindersApi.getReminder(id as number),
    enabled: id !== undefined,
  });
}
