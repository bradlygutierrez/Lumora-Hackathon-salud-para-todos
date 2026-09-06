jest.mock('@/features/notifications/api/notifications-api', () => ({
  notificationsApi: {
    getPatientNotifications: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

function baseNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    usuario_id: 3,
    recordatorio_id: null,
    titulo: 'Resultados de laboratorio disponibles',
    mensaje: 'Ya están disponibles.',
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

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [],
      switchPatient: jest.fn(),
    });
  });

  it('fetches notifications for the active patient and counts the unread ones', async () => {
    (notificationsApi.getPatientNotifications as jest.Mock).mockResolvedValue([
      baseNotification({ id: 1, leido: false }),
      baseNotification({ id: 2, leido: true }),
      baseNotification({ id: 3, leido: false }),
    ]);

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useNotifications(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(notificationsApi.getPatientNotifications).toHaveBeenCalledWith(7);
    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.unreadCount).toBe(2);
  });

  it('marks a notification as read and refreshes the list', async () => {
    (notificationsApi.getPatientNotifications as jest.Mock).mockResolvedValue([
      baseNotification({ id: 1, leido: false }),
    ]);
    (notificationsApi.markAsRead as jest.Mock).mockResolvedValue(
      baseNotification({ id: 1, leido: true }),
    );

    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(() => useNotifications(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.markAsRead(1);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications', 7] }),
    );
    expect(notificationsApi.markAsRead).toHaveBeenCalledWith(1);
  });

  it('does not call the API while patientContext is still resolving', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'loading',
      role: 'patient',
      activePatient: undefined,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useNotifications(), {
      wrapper: createQueryWrapper(client),
    });

    expect(notificationsApi.getPatientNotifications).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });
});
