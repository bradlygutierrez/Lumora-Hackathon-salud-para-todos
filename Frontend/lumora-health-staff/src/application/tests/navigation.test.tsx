import { render } from '@testing-library/react-native';

import StaffLayout from '@/app/(staff)/_layout';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Tabs = Object.assign(
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    {
      Screen: ({ name }: { name: string }) =>
        React.createElement(Text, null, `Tab:${name}`),
    },
  );

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `Redirect:${href}`),
    Tabs,
  };
});

describe('staff navigation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects anonymous users to login', async () => {
    mockUseAuthSession.mockReturnValue({ status: 'anonymous' });

    const screen = await render(<StaffLayout />);

    expect(screen.getByText('Redirect:/(auth)/login')).toBeTruthy();
  });

  it('exposes staff tabs for authenticated sessions', async () => {
    mockUseAuthSession.mockReturnValue({
      status: 'authenticated',
      permissions: new Set(['clinica:manage']),
    });

    const screen = await render(<StaffLayout />);

    expect(screen.getByText('Tab:index')).toBeTruthy();
    expect(screen.getByText('Tab:patients')).toBeTruthy();
    expect(screen.getByText('Tab:directory')).toBeTruthy();
    expect(screen.getByText('Tab:security')).toBeTruthy();
    expect(screen.getByText('Tab:profile')).toBeTruthy();
  });

  it('redirects authenticated users without clinical permission away from the staff app', async () => {
    mockUseAuthSession.mockReturnValue({
      status: 'authenticated',
      permissions: new Set(),
    });

    const screen = await render(<StaffLayout />);

    expect(screen.getByText('Redirect:/unauthorized')).toBeTruthy();
    expect(screen.queryByText('Tab:index')).toBeNull();
  });

});
