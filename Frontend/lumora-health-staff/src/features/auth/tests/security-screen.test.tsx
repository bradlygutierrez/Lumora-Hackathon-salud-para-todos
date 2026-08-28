import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SecurityCenterScreen from '@/app/(staff)/security';
import { changeStaffPassword } from '@/src/features/auth/api/auth.api';

const mockSignOutAll = jest.fn();
const mockRevokeSession = jest.fn();
const mockLogoutOthers = jest.fn();
const mockInvalidateQueries = jest.fn();


jest.mock('@/src/features/auth/api/auth.api', () => ({
  changeStaffPassword: jest.fn(),
  setupMfa: jest.fn(),
}));

const mockedChangeStaffPassword = jest.mocked(changeStaffPassword);

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({ signOutAll: mockSignOutAll }),
}));

jest.mock('@/src/features/auth/hooks/use-security', () => ({
  useActiveSessions: () => ({
    isLoading: false,
    isError: false,
    data: [
      {
        id: 10,
        ip: '10.0.0.10',
        user_agent: 'Mobile Safari',
        created_at: '2026-08-27T10:00:00Z',
        last_used_at: '2026-08-27T10:05:00Z',
        expires_at: '2026-09-27T10:00:00Z',
        device_name: 'iPhone',
        platform: 'iOS',
        ip_address: '10.0.0.10',
        last_activity_at: '2026-08-27T10:05:00Z',
        is_current: false,
      },
      {
        id: 11,
        ip: '10.0.0.11',
        user_agent: 'Chrome',
        created_at: '2026-08-27T11:00:00Z',
        last_used_at: '2026-08-27T11:05:00Z',
        expires_at: '2026-09-27T11:00:00Z',
        device_name: 'Windows PC',
        platform: 'Windows',
        ip_address: '10.0.0.11',
        last_activity_at: '2026-08-27T11:05:00Z',
        is_current: true,
      },
    ],
  }),
  useMfaMethods: () => ({ isLoading: false, isError: false, data: [] }),
  useSecurityActions: () => ({
    disableMfa: { mutate: jest.fn() },
    revokeSession: { mutate: mockRevokeSession },
    logoutOthers: { mutateAsync: mockLogoutOthers },
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/src/shared/components/Button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ children, onPress, accessibilityLabel }: {
      children: React.ReactNode;
      onPress?: () => void;
      accessibilityLabel?: string;
    }) => React.createElement(
      Pressable,
      { onPress, accessibilityLabel, accessibilityRole: 'button' },
      React.createElement(Text, null, children),
    ),
  };
});

jest.mock('@/src/shared/components/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    TextField: ({ label, onChangeText, value }: {
      label: string;
      onChangeText?: (value: string) => void;
      value?: string;
    }) => React.createElement(TextInput, { accessibilityLabel: label, onChangeText, value }),
  };
});
jest.mock('@/src/shared/components/AppTopBar', () => ({ AppTopBar: () => null }));
jest.mock('@/src/shared/components/RemoteState', () => ({
  EmptyState: () => null,
  ErrorState: () => null,
  LoadingState: () => null,
}));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('SecurityCenterScreen sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogoutOthers.mockResolvedValue({ message: 'ok' });
    mockedChangeStaffPassword.mockResolvedValue({ message: 'Contraseña actualizada' });
  });

  it('uses backend current-session metadata and revokes only remote sessions', async () => {
    const screen = await render(<SecurityCenterScreen />);

    expect(screen.getByText('Windows PC')).toBeTruthy();
    expect(screen.getByText('ACTUAL')).toBeTruthy();
    expect(screen.getByLabelText('Revocar sesión 10')).toBeTruthy();
    expect(screen.queryByLabelText('Revocar sesión 11')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Revocar sesión 10'));

    expect(mockRevokeSession).toHaveBeenCalledWith(10);

    await fireEvent.press(
      screen.getByText('Cerrar sesión en todos los demás dispositivos'),
    );

    await waitFor(() => expect(mockLogoutOthers).toHaveBeenCalledTimes(1));
    expect(mockSignOutAll).not.toHaveBeenCalled();
  });

  it('uses only backend-backed security data and changes the password through FastAPI', async () => {
    const screen = await render(<SecurityCenterScreen />);

    expect(screen.queryByText('hace 45 días (Oct 12, 2026)')).toBeNull();
    expect(screen.queryByText('Recuperación por SMS')).toBeNull();
    expect(screen.queryByText('Actividad de Seguridad Reciente')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'StrongOld123!');
    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'Stronger123!');
    await fireEvent.press(screen.getByText('Cambiar contraseña'));


    await waitFor(() =>
      expect(mockedChangeStaffPassword).toHaveBeenCalledWith({
        current_password: 'StrongOld123!',
        new_password: 'Stronger123!',
      }),
    );
  });

});
