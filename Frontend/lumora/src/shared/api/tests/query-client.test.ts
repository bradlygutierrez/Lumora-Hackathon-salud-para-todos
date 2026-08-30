import { ApiError } from '@/shared/api/api-error';
import { queryClient } from '@/shared/api/query-client';

describe('global query retry policy', () => {
  it('retries only temporary query errors and never mutations', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');

    const shouldRetry = retry as (failureCount: number, error: unknown) => boolean;
    expect(shouldRetry(0, new ApiError('NETWORK_ERROR', null, 'offline'))).toBe(true);
    expect(shouldRetry(0, new ApiError('SERVER_ERROR', 500, 'server'))).toBe(true);
    expect(shouldRetry(0, new ApiError('FORBIDDEN', 403, 'forbidden'))).toBe(false);
    expect(shouldRetry(2, new ApiError('NETWORK_ERROR', null, 'offline'))).toBe(false);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
