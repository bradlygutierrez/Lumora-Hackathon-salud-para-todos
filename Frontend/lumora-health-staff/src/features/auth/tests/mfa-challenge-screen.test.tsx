import { fireEvent, render, waitFor } from '@testing-library/react-native';

import MfaChallengeScreen from '@/app/(auth)/mfa-challenge';
import { verifyMfaChallenge } from '../api/auth.api';

const mockCompleteTokenSignIn = jest.fn();
const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../api/auth.api', () => ({
  recoverMfaChallenge: jest.fn(),
  verifyMfaChallenge: jest.fn(),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `redirect:${href}`),
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

jest.mock('@/src/shared/components/CodeBoxes', () => ({
  CodeBoxes: () => null,
}));

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const mockedVerifyMfaChallenge = jest.mocked(verifyMfaChallenge);

describe('MfaChallengeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      completeTokenSignIn: mockCompleteTokenSignIn,
      pendingMfa: {
        challengeToken: 'c'.repeat(32),
        expiresIn: 300,
        method: 'totp',
      },
    });
    mockedVerifyMfaChallenge.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
    });
  });

  it('uses the pending login challenge and backend MFA method', async () => {
    const screen = await render(<MfaChallengeScreen />);

    expect(screen.getByText('Aplicación de autenticación')).toBeTruthy();
    expect(screen.queryByTestId('Usuario')).toBeNull();
    expect(screen.queryByTestId('Contraseña')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('Código de verificación'),
      '123456',
    );
    await fireEvent.press(screen.getByText('Verificar'));

    await waitFor(() => {
      expect(mockedVerifyMfaChallenge).toHaveBeenCalledWith({
        challenge_token: 'c'.repeat(32),
        code: '123456',
      });
      expect(mockCompleteTokenSignIn).toHaveBeenCalledWith({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'bearer',
      });
    });
  });

  it('redirects to login when there is no pending MFA challenge', async () => {
    mockUseAuthSession.mockReturnValue({
      completeTokenSignIn: mockCompleteTokenSignIn,
      pendingMfa: null,
    });

    const screen = await render(<MfaChallengeScreen />);

    expect(screen.getByText('redirect:/(auth)/login')).toBeTruthy();
  });
});
