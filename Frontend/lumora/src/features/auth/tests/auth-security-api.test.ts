/**
 * Mock del cliente HTTP protegido.
 *
 * Las funciones se crean DENTRO del factory de jest.mock().
 *
 * Jest hace hoisting de jest.mock(), por lo que es más seguro
 * no depender de constantes declaradas fuera del factory.
 */
jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { authApi } from '@/features/auth/api/auth-api';

/**
 * Recuperamos exactamente la instancia mockeada que recibió AuthApiService.
 *
 * Esto evita tener dos referencias diferentes entre:
 * - el mock que usa auth-api.ts
 * - el mock que inspecciona el test
 */
const {
  httpClient: mockHttpClient,
} = jest.requireMock(
  '@/shared/api/http-client',
) as {
  httpClient: {
    get: jest.Mock;
    post: jest.Mock;
    delete: jest.Mock;
  };
};

describe(
  'AuthApiService authenticated B08 contract',
  () => {
    beforeEach(() => {
      /**
       * Limpiamos llamadas y respuestas de cada test.
       */
      mockHttpClient.get.mockReset();
      mockHttpClient.post.mockReset();
      mockHttpClient.delete.mockReset();
    });

    it(
      'uses the dedicated change-password endpoint',
      async () => {
        mockHttpClient.post.mockResolvedValue({
          message: 'Contraseña actualizada',
        });

        await authApi.changePassword(
          'OldStrong123!',
          'NewStrong123!',
        );

        expect(
          mockHttpClient.post,
        ).toHaveBeenCalledWith(
          '/auth/change-password',
          {
            current_password:
              'OldStrong123!',

            new_password:
              'NewStrong123!',
          },
        );
      },
    );

    it(
      'revokes a specific session by id',
      async () => {
        mockHttpClient.delete.mockResolvedValue(
          undefined,
        );

        await authApi.revokeSession(42);

        expect(
          mockHttpClient.delete,
        ).toHaveBeenCalledWith(
          '/auth/sessions/42',
        );
      },
    );

    it(
      'uses logout-others without revoking the current session endpoint',
      async () => {
        mockHttpClient.post.mockResolvedValue({
          message:
            'Las demás sesiones fueron cerradas',
        });

        await authApi.logoutOthers();

        expect(
          mockHttpClient.post,
        ).toHaveBeenCalledWith(
          '/auth/logout-others',
        );
      },
    );

    it(
      'lists the supported MFA methods from the authenticated endpoint',
      async () => {
        mockHttpClient.get.mockResolvedValue(
          [],
        );

        await authApi.mfaMethods();

        expect(
          mockHttpClient.get,
        ).toHaveBeenCalledWith(
          '/auth/mfa/methods',
        );
      },
    );
  },
);