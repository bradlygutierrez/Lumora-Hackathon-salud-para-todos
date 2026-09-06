import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ApiError, presentApiError, toApiError } from '@/shared/api/api-error';

describe('B08 ApiError mapping', () => {
  it('maps backend 429 domain errors to RATE_LIMITED and preserves message', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    mock.onPost('/resend').reply(429, {
      error: {
        code: 'rate_limited',
        message: 'Espera antes de solicitar otro código',
      },
    });

    try {
      await instance.post('/resend');
      throw new Error('Expected request to fail');
    } catch (error) {
      const mapped = toApiError(error);
      expect(mapped).toBeInstanceOf(ApiError);
      expect(mapped.code).toBe('RATE_LIMITED');
      expect(mapped.status).toBe(429);
      expect(mapped.message).toBe('Espera antes de solicitar otro código');
    } finally {
      mock.restore();
    }
  });

  it('repairs mojibake in backend domain messages', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    mock.onPost('/mfa').reply(400, {
      error: {
        code: 'invalid_mfa_code',
        message: 'CÃ³digo MFA incorrecto',
      },
    });

    try {
      await instance.post('/mfa');
      throw new Error('Expected request to fail');
    } catch (error) {
      expect(toApiError(error).message).toBe('Código MFA incorrecto');
    } finally {
      mock.restore();
    }
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION'],
    [500, 'SERVER_ERROR'],
  ] as const)('maps HTTP %s to %s', async (status, code) => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    mock.onGet('/resource').reply(status, { detail: 'backend detail' });

    await expect(instance.get('/resource')).rejects.toBeDefined();
    try {
      await instance.get('/resource');
    } catch (error) {
      expect(toApiError(error).code).toBe(code);
    } finally {
      mock.restore();
    }
  });

  it('maps requests without response to NETWORK_ERROR', () => {
    const error = new axios.AxiosError('Network Error');
    expect(toApiError(error)).toMatchObject({ code: 'NETWORK_ERROR', status: null });
  });

  it('only retries temporary errors', () => {
    expect(new ApiError('NETWORK_ERROR', null, 'offline').isRetryable()).toBe(true);
    expect(new ApiError('SERVER_ERROR', 500, 'server').isRetryable()).toBe(true);
    expect(new ApiError('FORBIDDEN', 403, 'forbidden').isRetryable()).toBe(false);
  });

  it('presents patient-friendly messages without backend details', () => {
    expect(presentApiError(new ApiError('FORBIDDEN', 403, 'internal'))).toEqual({
      title: 'Acción no permitida',
      message: 'No tenés permiso para realizar esta acción.',
      kind: 'forbidden',
    });
    expect(presentApiError(new ApiError('SERVER_ERROR', 500, 'stack trace'))).toEqual({
      title: 'No pudimos completar la solicitud',
      message: 'Intentá nuevamente.',
      kind: 'error',
    });
  });
});
