import { render } from '@testing-library/react-native';

import { AppTopBar } from '../AppTopBar';

const mockUseNotifications = jest.fn();

jest.mock('@/src/features/notifications/hooks/use-notifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ children, href }: { children: React.ReactElement; href: string }) =>
      React.cloneElement(children, { testHref: href }),
  };
});

describe('AppTopBar', () => {
  it('shows no badge when there are no unread notifications', async () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 0 });

    const screen = await render(<AppTopBar />);

    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows the unread count as a badge on the bell', async () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 3 });

    const screen = await render(<AppTopBar />);

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('caps the badge at "9+" for large counts', async () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 42 });

    const screen = await render(<AppTopBar />);

    expect(screen.getByText('9+')).toBeTruthy();
  });

  it('links the profile avatar to the settings screen', async () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 0 });

    const screen = await render(<AppTopBar />);

    const avatar = screen.getByLabelText('Abrir mi perfil');
    expect(avatar.props.testHref).toBe('/(staff)/profile');
  });

  it('shows a back button instead of the profile link when showBack is set', async () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 0 });

    const screen = await render(<AppTopBar showBack />);

    expect(screen.getByLabelText('Volver')).toBeTruthy();
    expect(screen.queryByLabelText('Abrir mi perfil')).toBeNull();
  });
});
