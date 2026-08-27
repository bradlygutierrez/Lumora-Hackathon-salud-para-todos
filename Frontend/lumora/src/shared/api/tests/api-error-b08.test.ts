import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ApiError, toApiError } from '@/shared/api/api-error';

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
});
