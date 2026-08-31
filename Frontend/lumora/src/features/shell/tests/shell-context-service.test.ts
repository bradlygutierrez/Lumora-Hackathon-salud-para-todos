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
      availablePatients: [{ patientId: 7, accessLevel: null }],
    });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(getSpy).toHaveBeenNthCalledWith(2, '/patients/me');
  });

  // --- A12: cuidador -----------------------------------------------------

  it('loads only the active linked patients for a caregiver, mapping access_level', async () => {
    jest.spyOn(httpClient, 'get').mockImplementation(async (url) => {
      if (url === '/auth/me') {
        return {
          id: 11,
          email: 'caregiver@example.com',
          username: 'caregiver',
          activo: true,
          email_verificado: true,
          persona: {
            id: 20,
            nombres: 'Cuida',
            apellidos: 'Dor',
          },
          roles: [{ id: 2, nombre: 'Cuidador' }],
        } as never;
      }

      if (url === '/caregivers/me/patients') {
        return {
          items: [
            {
              patient_id: 7,
              relationship: 'Madre',
              status: 'active',
              access_level: 'read',
              patient: {
                id: 7,
                first_names: 'Ana',
                last_names: 'López',
              },
            },
            {
              patient_id: 8,
              relationship: 'Padre',
              status: 'revoked',
              access_level: null,
              patient: {
                id: 8,
                first_names: 'Luis',
                last_names: 'López',
              },
            },
          ],
        } as never;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const identity = await shellContextService.loadIdentity();

    expect(identity.role).toBe('caregiver');
    // Solo la relación "active" se expone -- la revocada no aparece
    // en el contexto de navegación (A12: "manejar relación revocada").
    expect(identity.availablePatients).toEqual([
      {
        patientId: 7,
        displayName: 'Ana López',
        relationship: 'Madre',
        accessLevel: 'read',
      },
    ]);
  });

  it('re-queries the same active-linked-patients data through caregiverPatientContexts', async () => {
    const getSpy = jest.spyOn(httpClient, 'get').mockImplementation(async (url) => {
      if (url === '/caregivers/me/patients') {
        return {
          items: [
            {
              patient_id: 7,
              relationship: 'Madre',
              status: 'active',
              access_level: 'write',
              patient: {
                id: 7,
                first_names: 'Ana',
                last_names: 'López',
              },
            },
          ],
        } as never;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    // useCaregiverPatientsSync (A12) llama a este método público
    // directamente, sin pasar por loadIdentity(), para revalidar
    // periódicamente el acceso del cuidador.
    const patients = await shellContextService.caregiverPatientContexts();

    expect(patients).toEqual([
      {
        patientId: 7,
        displayName: 'Ana López',
        relationship: 'Madre',
        accessLevel: 'write',
      },
    ]);
    expect(getSpy).toHaveBeenCalledWith('/caregivers/me/patients');
  });
});
