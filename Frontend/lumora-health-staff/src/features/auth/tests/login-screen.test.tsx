import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';

const mockPush = jest.fn();
const mockSignIn = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/src/shared/components/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  return {
    TextField: ({ label, ...props }: { label: string }) =>
      React.createElement(TextInput, { testID: label, ...props }),
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
      onPress?: () => void;
    }) =>
      React.createElement(
        Pressable,
        { onPress },
        React.createElement(Text, null, children),
      ),
  };
});

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/src/shared/components/LumoraBrand', () => ({
  LumoraBrand: () => null,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes to the MFA challenge returned by login without asking credentials again', async () => {
    mockSignIn.mockResolvedValue('mfa_required');
    const screen = await render(<LoginScreen />);

    await fireEvent.changeText(
      screen.getByTestId('Usuario o Correo electrónico'),
      'doctor@example.com',
    );
    await fireEvent.changeText(screen.getByTestId('Contraseña'), 'safe-password');
    await fireEvent.press(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        login: 'doctor@example.com',
        password: 'safe-password',
      });
      expect(mockPush).toHaveBeenCalledWith('/(auth)/mfa-challenge');
    });
  });

  it('does not expose the old clinical preview entry point', async () => {
    const screen = await render(<LoginScreen />);

    expect(screen.queryByText('Previsualizar pantallas')).toBeNull();
    expect(screen.queryByText('Acceder con MFA')).toBeNull();
  });
});
