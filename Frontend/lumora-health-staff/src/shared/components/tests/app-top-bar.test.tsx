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
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
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
});
