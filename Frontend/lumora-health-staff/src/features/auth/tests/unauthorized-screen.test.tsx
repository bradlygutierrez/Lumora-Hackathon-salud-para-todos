import { fireEvent, render } from '@testing-library/react-native';

import UnauthorizedScreen from '@/app/unauthorized';

const mockUseAuthSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/src/shared/components/Button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({
      children,
      onPress,
    }: {
      children: React.ReactNode;
      onPress: () => void | Promise<void>;
    }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: 'button', onPress },
        React.createElement(Text, null, children),
      ),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `Redirect:${href}`),
  };
});

describe('UnauthorizedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockUseAuthSession.mockReturnValue({
      signOut: mockSignOut,
      status: 'authenticated',
    });
  });

  it('closes the current session from the unauthorized screen', async () => {
    const screen = await render(<UnauthorizedScreen />);

    await fireEvent.press(screen.getByText('Cerrar sesión'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('returns to login once the session becomes anonymous', async () => {
    mockUseAuthSession.mockReturnValue({
      signOut: mockSignOut,
      status: 'anonymous',
    });

    const screen = await render(<UnauthorizedScreen />);

    expect(screen.getByText('Redirect:/(auth)/login')).toBeTruthy();
    expect(screen.queryByText('Acceso clínico no autorizado')).toBeNull();
  });
});
