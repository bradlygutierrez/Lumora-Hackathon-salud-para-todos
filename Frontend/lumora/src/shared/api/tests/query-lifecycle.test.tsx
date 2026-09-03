import type { NetInfoState } from '@react-native-community/netinfo';
import { act, render } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.native ?? specifics.default,
  },
  AppState: { addEventListener: jest.fn() },
  StyleSheet: { flatten: (style: unknown) => style ?? {} },
  Text: 'Text',
  View: 'View',
}));

let mockNetworkListener: ((state: NetInfoState) => void) | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((listener: (state: NetInfoState) => void) => {
    mockNetworkListener = listener;
    return jest.fn();
  }),
}));

import { queryLifecycle } from '@/shared/api/query-lifecycle';
import { GlobalOfflineBanner } from '@/shared/components/GlobalOfflineBanner';
import { useConnectivity } from '@/shared/hooks/useConnectivity';

function ConnectivityValue() {
  const { isOnline } = useConnectivity();
  return <Text>{isOnline ? 'online' : 'offline'}</Text>;
}

describe('query lifecycle connectivity', () => {
  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
    queryLifecycle.configure();
  });

  afterEach(() => {
    queryLifecycle.cleanup();
    jest.restoreAllMocks();
  });

  it('reacts to offline and reconnection without polling', async () => {
    const { getByText, queryByText } = await render(
      <><ConnectivityValue /><GlobalOfflineBanner /></>,
    );
    expect(getByText('online')).toBeTruthy();

    await act(() => mockNetworkListener?.({ isConnected: false, isInternetReachable: false } as NetInfoState));
    expect(getByText('offline')).toBeTruthy();
    expect(getByText(/Sin conexión/)).toBeTruthy();

    await act(() => mockNetworkListener?.({ isConnected: true, isInternetReachable: true } as NetInfoState));
    expect(getByText('online')).toBeTruthy();
    expect(queryByText(/Sin conexión/)).toBeNull();
  });
});
