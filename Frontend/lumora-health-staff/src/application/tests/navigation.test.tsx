import { render } from '@testing-library/react-native';

import StaffLayout from '@/app/(staff)/_layout';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@wrack/react-native-tour-guide', () => {
  const React = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    TourTarget: ({ children, id }: { children: React.ReactNode; id: string }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `Target:${id}`),
        children,
      ),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Tabs = Object.assign(
    (
      {
        children,
        initialRouteName,
        backBehavior,
      }: { children: React.ReactNode; initialRouteName?: string; backBehavior?: string },
    ) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Text, null, `InitialRouteName:${initialRouteName}`),
        React.createElement(Text, null, `BackBehavior:${backBehavior}`),
        children,
      ),
    {
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options?: {
          href?: null;
          tabBarIcon?: (props: { color: string; size: number }) => React.ReactNode;
        };
      }) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Text, null, `Tab:${name}`),
          options?.href === null
            ? null
            : options?.tabBarIcon?.({ color: '#000', size: 24 }),
        ),
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
    expect(screen.getByText('Target:tour-tab-patients')).toBeTruthy();
    expect(screen.getByText('Target:tour-tab-agenda')).toBeTruthy();
    expect(screen.getByText('Target:tour-tab-directory')).toBeTruthy();
    expect(screen.getByText('Target:tour-tab-profile')).toBeTruthy();
    expect(screen.queryByText('Target:tour-tab-administration')).toBeNull();
  });

  it('registers the administration target only with RBAC permission', async () => {
    mockUseAuthSession.mockReturnValue({
      status: 'authenticated',
      permissions: new Set(['clinica:manage', 'rbac:manage']),
    });

    const screen = await render(<StaffLayout />);

    expect(screen.getByText('Target:tour-tab-administration')).toBeTruthy();
  });

  it('falls back to the dashboard tab, not administration, when there is no back-navigation history', async () => {
    mockUseAuthSession.mockReturnValue({
      status: 'authenticated',
      permissions: new Set(['clinica:manage']),
    });

    const screen = await render(<StaffLayout />);

    expect(screen.getByText('InitialRouteName:index')).toBeTruthy();
    // Regresión: @react-navigation/bottom-tabs resuelve "volver" (botón o
    // gesto físico de Android, o cualquier GO_BACK sin historial) usando
    // `backBehavior`, que por defecto es 'firstRoute' -- IGNORA
    // initialRouteName por completo. Sin fijarlo explícitamente en
    // 'initialRoute', el botón físico de atrás seguía cayendo en
    // "administration" (la primera Tabs.Screen registrada) y mostraba
    // "Acceso restringido" a cualquier staff sin rbac:manage.
    expect(screen.getByText('BackBehavior:initialRoute')).toBeTruthy();
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
