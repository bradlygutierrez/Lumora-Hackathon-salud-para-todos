import {
  httpClient,
} from '@/shared/api/http-client';

import {
  secureSession,
} from '@/shared/api/secure-session';

import {
  resolveLumoraRole,
} from '@/features/shell/navigation/shell-route-guard';

import type {
  CaregiverPatientLink,
  CurrentUser,
  PatientContext,
  ShellIdentity,
} from '@/features/shell/types/shell.types';

type JwtPayload = {
  sub?: string;
};

/**
 * Respuesta del endpoint seguro:
 *
 * GET /patients/me
 *
 * El backend resuelve el paciente utilizando
 * exclusivamente la identidad autenticada.
 */
type OwnPatientContextResponse = {
  patient_id: number;
  first_names: string;
  last_names: string;
};

/**
 * Error específico para indicar que el backend
 * todavía no expone correctamente las relaciones
 * Caregiver -> Patient.
 */
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

/**
 * Servicio responsable de construir el contexto
 * de navegación privado de Lumora.
 *
 * Responsabilidades:
 *
 * 1. Resolver el usuario autenticado.
 * 2. Resolver su rol funcional.
 * 3. Resolver los pacientes permitidos.
 * 4. Entregar esa información al ShellBootstrap.
 *
 * Este servicio NO almacena datos clínicos.
 */
export class ShellContextService {
  /**
   * Construye la identidad completa utilizada
   * por el shell privado de la aplicación.
   */
  public async loadIdentity():
    Promise<ShellIdentity> {
    const userId =
      await this.currentUserId();

    /**
     * B08/B09:
     * Obtenemos el usuario actual usando el ID
     * almacenado dentro del JWT.
     */
    const user =
      await httpClient.get<CurrentUser>(
        `/usuarios/${userId}`,
      );

    const role =
      resolveLumoraRole(
        user.roles,
      );

    /**
     * Paciente:
     *
     * Su único contexto válido es su propio
     * perfil de paciente.
     */
    if (
      role ===
      'patient'
    ) {
      const availablePatients =
        await this.ownPatientContext();

      return {
        user,
        role,
        availablePatients,
      };
    }

    /**
     * Cuidador:
     *
     * Puede tener uno o varios pacientes
     * vinculados mediante relaciones activas.
     */
    if (
      role ===
      'caregiver'
    ) {
      const availablePatients =
        await this
          .caregiverPatientContexts();

      return {
        user,
        role,
        availablePatients,
      };
    }

    /**
     * Roles fuera del alcance de la app
     * Patient/Caregiver.
     */
    return {
      user,
      role,
      availablePatients: [],
    };
  }

  /**
   * Obtiene el ID de usuario desde el JWT
   * almacenado en SecureStore.
   */
  private async currentUserId():
    Promise<number> {
    const session =
      await secureSession.get();

    if (
      !session?.accessToken
    ) {
      throw new Error(
        'No existe una sesión autenticada.',
      );
    }

    const payload =
      this.decodeJwtPayload(
        session.accessToken,
      );

    const userId =
      Number(
        payload.sub,
      );

    if (
      !Number.isInteger(
        userId,
      ) ||
      userId <= 0
    ) {
      throw new Error(
        'El access token no contiene un usuario válido.',
      );
    }

    return userId;
  }

  /**
   * Resuelve el patientContext del usuario
   * autenticado cuando su rol es Paciente.
   *
   * IMPORTANTE:
   *
   * Anteriormente B09 hacía:
   *
   * GET /pacientes?limit=100
   *
   * y buscaba manualmente el paciente dentro
   * de la lista completa.
   *
   * Eso ya no es válido porque el backend
   * protege la enumeración de pacientes.
   *
   * El endpoint correcto es:
   *
   * GET /patients/me
   *
   * De esta manera:
   *
   * - no enumeramos otros pacientes;
   * - evitamos 403;
   * - no dependemos de persona.id;
   * - dejamos al backend como fuente de verdad.
   */
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
      },
    ];
  }

  /**
   * Obtiene todos los pacientes autorizados
   * para el caregiver autenticado.
   *
   * Solo incluimos relaciones activas.
   *
   * La validación de autorización real continúa
   * siendo responsabilidad del backend.
   */
  private async caregiverPatientContexts():
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
          }),
        );
    } catch (error) {
      /**
       * Normalizamos únicamente el caso donde
       * el endpoint todavía no está disponible.
       */
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

  /**
   * Decodifica únicamente el payload del JWT.
   *
   * No intenta validar criptográficamente el token.
   * Esa validación pertenece al backend.
   *
   * Aquí solo necesitamos leer `sub` para obtener
   * el ID del usuario autenticado.
   */
  private decodeJwtPayload(
    token: string,
  ): JwtPayload {
    const parts =
      token.split('.');

    if (
      parts.length < 2
    ) {
      throw new Error(
        'Access token inválido.',
      );
    }

    /**
     * JWT usa Base64 URL-safe.
     *
     * Convertimos:
     * - "-" -> "+"
     * - "_" -> "/"
     */
    const payload =
      parts[1]
        .replace(
          /-/g,
          '+',
        )
        .replace(
          /_/g,
          '/',
        );

    /**
     * Base64 requiere longitud múltiplo de 4.
     */
    const padded =
      payload.padEnd(
        Math.ceil(
          payload.length /
            4,
        ) * 4,
        '=',
      );

    const decoded =
      globalThis.atob(
        padded,
      );

    return JSON.parse(
      decoded,
    ) as JwtPayload;
  }
}

/**
 * Singleton compartido por ShellBootstrap.
 */
export const shellContextService =
  new ShellContextService();