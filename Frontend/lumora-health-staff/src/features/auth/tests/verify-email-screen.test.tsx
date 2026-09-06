import { fireEvent, render, waitFor } from '@testing-library/react-native';

import VerifyEmailScreen from '@/app/(auth)/verify-email';
import { resendEmailVerification, verifyEmailCode } from '../api/auth.api';

jest.mock('../api/auth.api', () => ({
  resendEmailVerification: jest.fn(),
  verifyEmailCode: jest.fn(),
}));

const mockedVerifyEmailCode = jest.mocked(verifyEmailCode);
const mockedResendEmailVerification = jest.mocked(resendEmailVerification);

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
  };
});

jest.mock('@/src/shared/components/CodeBoxes', () => ({ CodeBoxes: () => null }));

jest.mock('@/src/shared/components/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    TextField: ({ label, onChangeText, value }: {
      label: string;
      onChangeText?: (value: string) => void;
      value?: string;
    }) => React.createElement(TextInput, { testID: label, onChangeText, value }),
  };
});

jest.mock('@/src/shared/components/Button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) =>
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

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerifyEmailCode.mockResolvedValue({ message: 'Correo verificado' });
    mockedResendEmailVerification.mockResolvedValue({ message: 'Código reenviado' });
  });

  it('verifies a six-digit code and resends through backend endpoints', async () => {
    const screen = await render(<VerifyEmailScreen />);

    expect(screen.queryByText('Reenviar en 00:29')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('Correo'), 'doctor@example.com');
    await fireEvent.changeText(screen.getByTestId('Código de verificación'), '123456');
    await fireEvent.press(screen.getByText('Verificar'));


    await waitFor(() =>
      expect(mockedVerifyEmailCode).toHaveBeenCalledWith({
        email: 'doctor@example.com',
        code: '123456',
      }),
    );

    await fireEvent.press(screen.getByText('Reenviar código'));

    await waitFor(() =>
      expect(mockedResendEmailVerification).toHaveBeenCalledWith({
        email: 'doctor@example.com',
      }),
    );
  });
});
