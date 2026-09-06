import type { AxiosRequestConfig } from 'axios';

import type {
  AppointmentAvailability,
  AppointmentCancelRequest,
  AppointmentCatalogPage,
  AppointmentCreateRequest,
  AppointmentLocation,
  AppointmentProfessionalSummary,
  AppointmentRescheduleRequest,
  AppointmentResponse,
  ProfessionalFilters,
} from '@/features/appointments/types/appointments.types';
import { httpClient } from '@/shared/api/http-client';

export type AppointmentHttpClient = {
  get<TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<TResponse>;

  post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse>;

  patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse>;
};

/**
 * API patient-facing de Citas.
 *
 * El backend es la autoridad de permisos. El frontend siempre envía el
 * patientContext activo y nunca utiliza los endpoints administrativos de
 * profesionales o el PATCH/DELETE genérico de citas.
 */
export class AppointmentsApiService {
  constructor(
    private readonly client: AppointmentHttpClient = httpClient,
  ) {}

  public list(
    patientId: number,
  ): Promise<AppointmentResponse[]> {
    return this.client.get('/citas', {
      params: {
        paciente_id: patientId,
      },
    });
  }

  public detail(
    appointmentId: number,
  ): Promise<AppointmentResponse> {
    return this.client.get(
      `/citas/${appointmentId}`,
    );
  }

  public professionals(
    filters: ProfessionalFilters = {},
  ): Promise<AppointmentProfessionalSummary[]> {
    const q = filters.q?.trim();
    const specialty =
      filters.specialty?.trim();

    return this.client.get(
      '/citas/profesionales-disponibles',
      {
        params: {
          ...(q ? { q } : {}),
          ...(specialty
            ? {
                especialidad:
                  specialty,
              }
            : {}),
        },
      },
    );
  }

  public availability(
    professionalId: number,
    date: string,
  ): Promise<AppointmentAvailability> {
    return this.client.get(
      '/citas/disponibilidad',
      {
        params: {
          profesional_id:
            professionalId,
          fecha: date,
        },
      },
    );
  }

  public async locations(): Promise<
    AppointmentLocation[]
  > {
    const locations = await this.client.get<AppointmentLocation[]>(
      '/citas/ubicaciones-disponibles',
    );

    return locations.map((location) => ({
      ...location,
      nombre: location.nombre.replace(/\bCl\?nica\b/g, 'Clínica'),
    }));
  }

  public appointmentTypes(): Promise<AppointmentCatalogPage> {
    return this.client.get(
      '/tipos-cita',
      {
        params: {
          limit: 100,
          offset: 0,
        },
      },
    );
  }

  public create(
    data: AppointmentCreateRequest,
  ): Promise<AppointmentResponse> {
    return this.client.post<
      AppointmentResponse,
      AppointmentCreateRequest
    >('/citas', data);
  }

  public reschedule(
    appointmentId: number,
    data: AppointmentRescheduleRequest,
  ): Promise<AppointmentResponse> {
    return this.client.patch<
      AppointmentResponse,
      AppointmentRescheduleRequest
    >(
      `/citas/${appointmentId}/reprogramar`,
      data,
    );
  }

  public cancel(
    appointmentId: number,
    motivo?: string | null,
  ): Promise<AppointmentResponse> {
    const data: AppointmentCancelRequest =
      motivo?.trim()
        ? {
            motivo: motivo.trim(),
          }
        : {};

    return this.client.post<
      AppointmentResponse,
      AppointmentCancelRequest
    >(
      `/citas/${appointmentId}/cancelar`,
      data,
    );
  }
}

export const appointmentsApi =
  new AppointmentsApiService();
