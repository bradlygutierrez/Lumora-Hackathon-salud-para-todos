import { AxiosError } from 'axios';

import { toApiError } from './api-error';

describe('toApiError', () => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation_error'],
    [500, 'server_error'],
  ] as const)('maps HTTP %s to %s', (status, code) => {
    const error = new AxiosError('Request failed', undefined, undefined, undefined, {
      data: { error: { message: 'Backend message' } },
      status,
      statusText: 'Error',
      headers: {},
      config: {} as never,
    });

    const apiError = toApiError(error);

    expect(apiError.code).toBe(code);
    expect(apiError.status).toBe(status);
    expect(apiError.message).toBe('Backend message');
  });

  it('maps network failures to offline', () => {
    const apiError = toApiError(new AxiosError('Network Error'));

    expect(apiError.code).toBe('offline');
  });
});
