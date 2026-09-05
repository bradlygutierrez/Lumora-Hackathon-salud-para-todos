import { fireEvent, render } from '@testing-library/react-native';

import { NotificationsScreen } from '../screens/NotificationsScreen';

const mockUseNotifications = jest.fn();
const mockMarkAsReadMutate = jest.fn();

jest.mock('../hooks/use-notifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/src/shared/components/AppTopBar', () => ({
  AppTopBar: () => null,
}));

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const unreadNotification = {
  id: 1,
  usuario_id: 7,
  recordatorio_id: 4,
  titulo: 'Cita Próxima',
  mensaje: 'Recuerda tu cita el 10/09 09:00.',
  canal: 'APP',
  tipo: 'cita' as const,
  enviado: true,
  fecha_envio: '2026-09-04T00:00:00Z',
  leido: false,
  fecha_lectura: null,
  creado_en: '2026-09-04T00:00:00Z',
};

const readNotification = {
  ...unreadNotification,
  id: 2,
  titulo: 'Dosis Omitida',
  mensaje: 'No has registrado la toma.',
  tipo: 'recordatorio' as const,
  leido: true,
  fecha_lectura: '2026-09-04T00:05:00Z',
};

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while fetching', async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: true,
      isError: false,
      markAsRead: { mutate: mockMarkAsReadMutate },
    });

    const screen = await render(<NotificationsScreen />);

    expect(screen.getByText('Cargando notificaciones')).toBeTruthy();
  });

  it('shows an empty state when there are no notifications', async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isError: false,
      markAsRead: { mutate: mockMarkAsReadMutate },
    });

    const screen = await render(<NotificationsScreen />);

    expect(screen.getByText('No tenés notificaciones')).toBeTruthy();
  });

  it('shows an error state when the request fails', async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isError: true,
      markAsRead: { mutate: mockMarkAsReadMutate },
    });

    const screen = await render(<NotificationsScreen />);

    expect(screen.getByText('No se pudieron cargar tus notificaciones')).toBeTruthy();
  });

  it('renders notifications and marks an unread one as read on press', async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [unreadNotification, readNotification],
      unreadCount: 1,
      isLoading: false,
      isError: false,
      markAsRead: { mutate: mockMarkAsReadMutate },
    });

    const screen = await render(<NotificationsScreen />);

    expect(screen.getByText('1 sin leer')).toBeTruthy();
    expect(screen.getByText('Cita Próxima')).toBeTruthy();
    expect(screen.getByText('Dosis Omitida')).toBeTruthy();

    fireEvent.press(screen.getByText('Cita Próxima'));

    expect(mockMarkAsReadMutate).toHaveBeenCalledWith(1);
  });
});
