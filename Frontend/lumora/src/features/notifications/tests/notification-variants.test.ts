import { actionsForNotification } from '@/features/notifications/utils/notification-variants';
import type { NotificationResponse } from '@/features/notifications/types/notifications.types';

function notification(overrides: Partial<NotificationResponse>): NotificationResponse {
  return {
    id: 1,
    usuario_id: 3,
    recordatorio_id: null,
    titulo: 'Título',
    mensaje: 'Mensaje',
    canal: 'APP',
    tipo: 'sistema',
    enviado: true,
    fecha_envio: '2026-08-26T08:00:00Z',
    leido: false,
    fecha_lectura: null,
    creado_en: '2026-08-26T08:00:00Z',
    ...overrides,
  };
}

describe('notification-variants', () => {
  it('gives "alerta" a single "Ver Detalles" action that links to Indicadores', () => {
    const actions = actionsForNotification(notification({ tipo: 'alerta' }));
    expect(actions).toEqual([
      { label: 'Ver Detalles', variant: 'primary', href: '/(app)/health-indicators' },
    ]);
  });

  it('gives "recordatorio" two disabled actions (no Recordatorio screen yet)', () => {
    const actions = actionsForNotification(notification({ tipo: 'recordatorio' }));
    expect(actions).toEqual([
      { label: 'Marcar tomada', variant: 'primary', disabled: true },
      { label: 'Posponer', variant: 'secondary', disabled: true },
    ]);
  });

  it('gives "cita" and "sistema" no actions', () => {
    expect(actionsForNotification(notification({ tipo: 'cita' }))).toEqual([]);
    expect(actionsForNotification(notification({ tipo: 'sistema' }))).toEqual([]);
  });
});
