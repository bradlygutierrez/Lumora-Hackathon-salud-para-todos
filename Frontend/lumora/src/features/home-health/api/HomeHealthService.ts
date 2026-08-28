import {
  healthIndicatorsApi,
} from '@/features/health-indicators/api/health-indicators-api';

import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

import type {
  AppointmentResponse,
  CatalogPage,
  HealthSummaryResponse,
  HomeHealthDashboardData,
  NextDose,
} from '@/features/home-health/types/home-health.types';

import {
  prescriptionsApi,
} from '@/features/prescriptions/api/prescriptions-api';

import {
  schedulesApi,
} from '@/features/prescriptions/api/schedules-api';

import type {
  CatalogItem as PrescriptionCatalogItem,
  DosisAdministradaResponse,
  HorarioMedicamentoResponse,
  MedicamentoResponse,
  RecetaResponse,
} from '@/features/prescriptions/types/prescriptions.types';

import {
  httpClient,
} from '@/shared/api/http-client';

/**
 * Agrega los endpoints necesarios por B10.
 *
 * No almacena estado React ni navegación. Su única responsabilidad es
 * obtener datos autorizados para el patientContext y convertir varios
 * endpoints existentes en un snapshot coherente para Inicio/Mi Salud.
 */
export class HomeHealthService {
  /** GET /patients/{patient_id}/health-summary — contrato nuevo B10. */
  public getHealthSummary(
    patientId: number,
  ): Promise<HealthSummaryResponse> {
    return httpClient.get(
      `/patients/${patientId}/health-summary`,
    );
  }

  /**
   * GET /citas?paciente_id=...
   *
   * B10 backend valida el patientId con el guard central B09.
   */
  public getAppointments(
    patientId: number,
    from = new Date(),
  ): Promise<AppointmentResponse[]> {
    return httpClient.get('/citas', {
      params: {
        paciente_id: patientId,
        desde: from.toISOString(),
      },
    });
  }

  /** Catálogos necesarios únicamente para etiquetas legibles. */
  public getMeasurementUnits(): Promise<CatalogPage> {
    return httpClient.get('/unidades-medida?limit=100');
  }

  public getAppointmentTypes(): Promise<CatalogPage> {
    return httpClient.get('/tipos-cita?limit=100');
  }

  /**
   * Carga el snapshot compartido por las dos pantallas de B10.
   * Todas las fuentes se consultan usando el mismo patientId activo.
   */
  public async loadDashboard(
    patientId: number,
    now = new Date(),
  ): Promise<HomeHealthDashboardData> {
    const [
      healthSummary,
      measurements,
      alerts,
      indicators,
      measurementUnitsPage,
      appointmentTypesPage,
      appointments,
      prescriptions,
      prescriptionStatuses,
      doseStatuses,
      medications,
    ] = await Promise.all([
      this.getHealthSummary(patientId),
      healthIndicatorsApi.getPatientMeasurements(patientId),
      healthIndicatorsApi.getPatientAlerts(patientId, true),
      healthIndicatorsApi.getIndicators(),
      this.getMeasurementUnits(),
      this.getAppointmentTypes(),
      this.getAppointments(patientId, now),
      prescriptionsApi.getPrescriptionsByPatient(patientId),
      prescriptionsApi.getPrescriptionStatuses(),
      prescriptionsApi.getDoseStatuses(),
      prescriptionsApi.getMedications(),
    ] as const);

    const nextDose = await this.resolveNextDose({
      prescriptions,
      prescriptionStatuses: prescriptionStatuses.items,
      doseStatuses: doseStatuses.items,
      medications,
      now,
    });

    return {
      patientId,
      healthSummary,
      measurements: measurements as MedicionIndicadorResponse[],
      alerts: alerts as AlertaClinicaResponse[],
      indicators: indicators as IndicadorMedicoResponse[],
      measurementUnits: measurementUnitsPage.items,
      appointmentTypes: appointmentTypesPage.items,
      appointments,
      nextDose,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Compone la próxima toma real a partir de A07.
   *
   * No usa `/pacientes/me`, por lo que funciona igual para Paciente y
   * Cuidador autorizado siempre que B09 haya resuelto activePatient.
   */
  private async resolveNextDose({
    prescriptions,
    prescriptionStatuses,
    doseStatuses,
    medications,
    now,
  }: {
    prescriptions: RecetaResponse[];
    prescriptionStatuses: PrescriptionCatalogItem[];
    doseStatuses: PrescriptionCatalogItem[];
    medications: MedicamentoResponse[];
    now: Date;
  }): Promise<NextDose | null> {
    const activeStatusId = this.catalogIdByName(
      prescriptionStatuses,
      'Activa',
    );

    if (activeStatusId === undefined) {
      return null;
    }

    const takenStatusId = this.catalogIdByName(
      doseStatuses,
      'Tomada',
    );

    const activeDetails = prescriptions
      .filter((prescription) => prescription.estado_id === activeStatusId)
      .flatMap((prescription) =>
        prescription.detalles.map((detail) => ({
          prescriptionId: prescription.id,
          detail,
        })),
      );

    if (activeDetails.length === 0) {
      return null;
    }

    const schedulesPerDetail = await Promise.all(
      activeDetails.map(async ({ prescriptionId, detail }) => ({
        prescriptionId,
        detail,
        schedules: await schedulesApi.getHorarios(detail.id),
      })),
    );

    const candidates = schedulesPerDetail.flatMap(
      ({ prescriptionId, detail, schedules }) =>
        schedules
          .filter((schedule) => schedule.activo)
          .map((schedule) => ({
            prescriptionId,
            detail,
            schedule,
          })),
    );

    if (candidates.length === 0) {
      return null;
    }

    const logsBySchedule = await Promise.all(
      candidates.map(({ schedule }) =>
        schedulesApi.getDosisLogs(schedule.id),
      ),
    );

    const resolved = candidates.map((candidate, index) => {
      const logs = logsBySchedule[index] ?? [];
      const takenToday =
        takenStatusId !== undefined &&
        this.hasTakenDoseToday(logs, takenStatusId, now);

      const scheduledToday = this.combineDateAndTime(
        now,
        candidate.schedule,
      );

      let scheduledAt = scheduledToday;

      /**
       * Una toma ya completada hoy pasa a su próxima ocurrencia mañana.
       * Una toma vencida pero no registrada permanece hoy y se marca como
       * pendiente/atrasada en lugar de esconderla.
       */
      if (takenToday) {
        scheduledAt = new Date(scheduledToday);
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      const medication = medications.find(
        (item) => item.id === candidate.detail.medicamento_id,
      );

      return {
        horarioId: candidate.schedule.id,
        detalleRecetaId: candidate.detail.id,
        recetaId: candidate.prescriptionId,
        medicationName: medication?.nombre ?? 'Medicamento',
        dose: candidate.detail.dosis,
        instructions:
          candidate.detail.instrucciones ?? candidate.detail.frecuencia,
        scheduledAt: scheduledAt.toISOString(),
        isOverdue:
          !takenToday && scheduledToday.getTime() < now.getTime(),
      } satisfies NextDose;
    });

    return (
      resolved.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      )[0] ?? null
    );
  }

  private catalogIdByName(
    items: PrescriptionCatalogItem[],
    name: string,
  ): number | undefined {
    const target = this.normalize(name);

    return items.find(
      (item) => this.normalize(item.nombre) === target,
    )?.id;
  }

  private hasTakenDoseToday(
    logs: DosisAdministradaResponse[],
    takenStatusId: number,
    today: Date,
  ): boolean {
    return logs.some(
      (log) =>
        log.estado_dosis_id === takenStatusId &&
        this.isSameLocalDay(new Date(log.fecha_programada), today),
    );
  }

  private combineDateAndTime(
    date: Date,
    schedule: HorarioMedicamentoResponse,
  ): Date {
    const [hours, minutes, seconds] = schedule.hora
      .split(':')
      .map((value) => Number(value));

    const result = new Date(date);
    result.setHours(hours || 0, minutes || 0, seconds || 0, 0);
    return result;
  }

  private isSameLocalDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('es');
  }
}

export const homeHealthService = new HomeHealthService();
