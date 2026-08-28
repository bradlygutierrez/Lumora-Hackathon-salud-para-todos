import { render } from '@testing-library/react-native';

import RootLayout from '@/app/_layout';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  AuthSessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@/src/application/providers/query-provider', () => ({
  AppQueryProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  DefaultTheme: { colors: {} },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-reanimated', () => ({}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Stack = Object.assign(
    ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    { Screen: ({ name }: { name: string }) => React.createElement(Text, null, `Stack:${name}`) },
  );
  return {
    Stack,
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `Redirect:${href}`),
  };
});

describe('root navigation', () => {
  it('does not force authenticated staff back to the staff index', async () => {
    mockUseAuthSession.mockReturnValue({
      status: 'authenticated',
      permissions: new Set(['clinica:manage']),
    });

    const screen = await render(<RootLayout />);

    expect(screen.queryByText('Redirect:/(staff)')).toBeNull();
  });

  it('does not force anonymous users away from nested auth routes', async () => {
    mockUseAuthSession.mockReturnValue({ status: 'anonymous', permissions: new Set() });

    const screen = await render(<RootLayout />);

    expect(screen.queryByText('Redirect:/(auth)/login')).toBeNull();
  });
});
