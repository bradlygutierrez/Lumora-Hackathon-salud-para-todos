import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { AuthApiService } from '@/features/auth/api/auth-api';

describe('AuthApiService public B08 contract', () => {
  const instance = axios.create();
  const mock = new MockAdapter(instance);
  const api = new AuthApiService(instance);

  beforeEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('maps login without MFA exactly as backend returns it', async () => {
    mock.onPost('/auth/login').reply(200, {
      mfa_required: false, access_token: 'access', refresh_token: 'refresh', token_type: 'bearer',
    });
    await expect(api.login('user', 'Strong123!')).resolves.toMatchObject({
      mfa_required: false, access_token: 'access', refresh_token: 'refresh',
    });
  });

  it('returns a challenge instead of tokens when MFA is required', async () => {
    mock.onPost('/auth/login').reply(200, {
      mfa_required: true, challenge_token: 'challenge-token-value', expires_in: 300,
    });
    await expect(api.login('user', 'Strong123!')).resolves.toEqual({
      mfa_required: true, challenge_token: 'challenge-token-value', expires_in: 300,
    });
  });

  it('maps refresh snake_case tokens to StoredSession', async () => {
    mock.onPost('/auth/refresh').reply(200, { access_token: 'new-a', refresh_token: 'new-r', token_type: 'bearer' });
    await expect(api.refreshSession('old-refresh-token-value-that-is-long')).resolves.toEqual({
      accessToken: 'new-a', refreshToken: 'new-r',
    });
  });
});
