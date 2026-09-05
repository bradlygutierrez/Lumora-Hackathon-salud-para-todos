import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { usePullToRefresh } from '../use-pull-to-refresh';

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('usePullToRefresh', () => {
  it('refetches active queries and toggles refreshing around it', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const refetchQueries = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);

    const { result } = await renderHook(() => usePullToRefresh(), {
      wrapper: createWrapper(client),
    });

    expect(result.current.refreshing).toBe(false);

    await act(() => {
      result.current.onRefresh();
    });

    expect(refetchQueries).toHaveBeenCalledWith({ type: 'active' });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });
});
