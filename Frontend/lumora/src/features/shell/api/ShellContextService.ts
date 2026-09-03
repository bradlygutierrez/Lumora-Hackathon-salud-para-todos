import {
  httpClient,
} from '@/shared/api/http-client';

import {
  resolveLumoraRole,
} from '@/features/shell/navigation/shell-route-guard';

import type {
  CaregiverPatientLink,
  CurrentUser,
  PatientContext,
  SelectableLumoraRole,
  ShellIdentity,
} from '@/features/shell/types/shell.types';

type OwnPatientContextResponse = {
  patient_id: number;
  first_names: string;
  last_names: string;
};

export class CaregiverRelationsUnavailableError
  extends Error {
  constructor() {
    super(
      'El backend todavía no expone las relaciones autorizadas del cuidador.',
    );

    this.name =
      'CaregiverRelationsUnavailableError';
  }
}

export class ShellContextService {
  public async loadIdentity():
    Promise<ShellIdentity> {
    const user =
      await httpClient.get<CurrentUser>(
        '/auth/me',
      );

    const role =
      resolveLumoraRole(
        user.roles,
      );

    if (
      role ===
      'patient'
    ) {
      return {
        user,
        role,
        availablePatients:
          await this.ownPatientContext(),
      };
    }

    if (
      role ===
      'caregiver'
    ) {
      return {
        user,
        role,
        availablePatients:
          await this.caregiverPatientContexts(),
      };
    }

    /**
     * En cuentas dual-role esperamos selección explícita.
     * No consultamos ni mezclamos patientContext hasta saber el modo.
     */
    return {
      user,
      role,
      availablePatients: [],
    };
  }

  public async contextsForRole(
    role: SelectableLumoraRole,
  ): Promise<PatientContext[]> {
    if (role === 'patient') {
      return this.ownPatientContext();
    }

    return this.caregiverPatientContexts();
  }

  private async ownPatientContext():
    Promise<PatientContext[]> {
    const patient =
      await httpClient.get<
        OwnPatientContextResponse
      >(
        '/patients/me',
      );

    return [
      {
        patientId:
          patient.patient_id,

        displayName:
          `${patient.first_names} ${patient.last_names}`.trim(),

        relationship:
          null,

        accessLevel:
          null,
      },
    ];
  }

  public async caregiverPatientContexts():
    Promise<PatientContext[]> {
    try {
      const response =
        await httpClient.get<{
          items:
            CaregiverPatientLink[];
        }>(
          '/caregivers/me/patients',
        );

      return response.items
        .filter(
          (item) =>
            item.status
              .toLowerCase() ===
            'active',
        )
        .map(
          (item) => ({
            patientId:
              item.patient_id,

            displayName:
              `${item.patient.first_names} ${item.patient.last_names}`.trim(),

            relationship:
              item.relationship,

            accessLevel:
              item.access_level,
          }),
        );
    } catch (error) {
      const maybeStatus =
        typeof error ===
          'object' &&
        error !== null &&
        'status' in error
          ? (
              error as {
                status?: number;
              }
            ).status
          : undefined;

      if (
        maybeStatus ===
        404
      ) {
        throw new CaregiverRelationsUnavailableError();
      }

      throw error;
    }
  }
}

export const shellContextService =
  new ShellContextService();
