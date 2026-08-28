import { httpClient } from '@/shared/api/http-client';
import { secureSession } from '@/shared/api/secure-session';

import { resolveLumoraRole } from '@/features/shell/navigation/shell-route-guard';

import type {
  CaregiverPatientLink,
  CurrentUser,
  PaginatedPatients,
  PatientContext,
  ShellIdentity,
} from '@/features/shell/types/shell.types';

type JwtPayload = {
  sub?: string;
};

export class CaregiverRelationsUnavailableError extends Error {
  constructor() {
    super(
      'El backend todavía no expone las relaciones autorizadas del cuidador.',
    );

    this.name = 'CaregiverRelationsUnavailableError';
  }
}

export class ShellContextService {
  public async loadIdentity(): Promise<ShellIdentity> {
    const userId = await this.currentUserId();

    const user = await httpClient.get<CurrentUser>(
      `/usuarios/${userId}`,
    );

    const role = resolveLumoraRole(user.roles);

    if (role === 'patient') {
      const availablePatients =
        await this.ownPatientContext(user);

      return {
        user,
        role,
        availablePatients,
      };
    }

    if (role === 'caregiver') {
      const availablePatients =
        await this.caregiverPatientContexts();

      return {
        user,
        role,
        availablePatients,
      };
    }

    return {
      user,
      role,
      availablePatients: [],
    };
  }

  private async currentUserId(): Promise<number> {
    const session = await secureSession.get();

    if (!session?.accessToken) {
      throw new Error(
        'No existe una sesión autenticada.',
      );
    }

    const payload = this.decodeJwtPayload(
      session.accessToken,
    );

    const userId = Number(payload.sub);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        'El access token no contiene un usuario válido.',
      );
    }

    return userId;
  }

  private async ownPatientContext(
    user: CurrentUser,
  ): Promise<PatientContext[]> {
    const response =
      await httpClient.get<PaginatedPatients>(
        '/pacientes?limit=100&offset=0',
      );

    const patient =
      response.items.find(
        (item) =>
          item.persona.id ===
          user.persona.id,
      );

    if (!patient) {
      return [];
    }

    return [
      {
        patientId: patient.id,

        displayName:
          `${patient.persona.nombres} ${patient.persona.apellidos}`.trim(),

        relationship: null,
      },
    ];
  }

  private async caregiverPatientContexts(): Promise<
    PatientContext[]
  > {
    try {
      const response =
        await httpClient.get<{
          items: CaregiverPatientLink[];
        }>(
          '/caregivers/me/patients',
        );

      return response.items
        .filter(
          (item) =>
            item.status.toLowerCase() ===
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
          }),
        );
    } catch (error) {
      const maybeStatus =
        typeof error === 'object' &&
        error !== null &&
        'status' in error
          ? (
              error as {
                status?: number;
              }
            ).status
          : undefined;

      if (maybeStatus === 404) {
        throw new CaregiverRelationsUnavailableError();
      }

      throw error;
    }
  }

  private decodeJwtPayload(
    token: string,
  ): JwtPayload {
    const parts = token.split('.');

    if (parts.length < 2) {
      throw new Error(
        'Access token inválido.',
      );
    }

    const payload =
      parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const padded =
      payload.padEnd(
        Math.ceil(
          payload.length / 4,
        ) * 4,
        '=',
      );

    const decoded =
      globalThis.atob(padded);

    return JSON.parse(
      decoded,
    ) as JwtPayload;
  }
}

export const shellContextService =
  new ShellContextService();