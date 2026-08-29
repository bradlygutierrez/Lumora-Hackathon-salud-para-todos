import {
  shellContextService,
} from '@/features/shell/api/ShellContextService';

import {
  httpClient,
} from '@/shared/api/http-client';

describe('ShellContextService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the authenticated patient without using administrative user routes', async () => {
    const getSpy = jest
      .spyOn(httpClient, 'get')
      .mockImplementation(async (url) => {
        if (url === '/auth/me') {
          return {
            id: 5,
            email: 'patient@example.com',
            username: 'patient',
            activo: true,
            email_verificado: true,
            persona: {
              id: 9,
              nombres: 'Ana',
              apellidos: 'López',
            },
            roles: [{ id: 1, nombre: 'Paciente' }],
          } as never;
        }

        if (url === '/patients/me') {
          return {
            patient_id: 7,
            first_names: 'Ana',
            last_names: 'López',
          } as never;
        }

        throw new Error(`Unexpected URL: ${url}`);
      });

    await expect(shellContextService.loadIdentity()).resolves.toMatchObject({
      role: 'patient',
      availablePatients: [{ patientId: 7 }],
    });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(getSpy).toHaveBeenNthCalledWith(2, '/patients/me');
  });
});
