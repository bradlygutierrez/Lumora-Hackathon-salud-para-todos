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
 * Servicio principal de datos para B10:
 *
 * - Inicio
 * - Inicio del cuidador
 * - Mi Salud
 *
 * Este servicio NO mantiene estado React.
 * Tampoco conoce navegación ni componentes.
 *
 * Su responsabilidad es exclusivamente:
 *
 * 1. Consumir los endpoints autorizados del backend.
 * 2. Mantener todas las consultas scoped al patientId de B09.
 * 3. Componer datos provenientes de varios módulos cuando
 *    FastAPI todavía no expone un endpoint agregado.
 */
export class HomeHealthService {
  // =========================================================
  // HEALTH SUMMARY
  // =========================================================

  /**
   * Obtiene alergias y condiciones activas.
   *
   * Endpoint B10:
   *
   * GET /patients/{patient_id}/health-summary
   *
   * Seguridad:
   *
   * - Paciente: únicamente su propio patientId.
   * - Caregiver: únicamente pacientes vinculados activos.
   *
   * La autorización real siempre ocurre en el backend.
   */
  public getHealthSummary(
    patientId: number,
  ): Promise<HealthSummaryResponse> {
    return httpClient.get(
      `/patients/${patientId}/health-summary`,
    );
  }

  // =========================================================
  // APPOINTMENTS
  // =========================================================

  /**
   * Obtiene las citas del patientContext activo.
   *
   * Endpoint:
   *
   * GET /citas?paciente_id={patientId}
   *
   * @param patientId
   * PatientContext resuelto por B09.
   *
   * @param from
   * Si recibe Date, solamente se consultan citas posteriores.
   *
   * Si recibe null, NO enviamos `desde`, permitiendo obtener
   * tanto próximas como anteriores.
   *
   * Esto permite:
   *
   * Inicio:
   *   getAppointments(patientId, new Date())
   *
   * Pantalla Citas:
   *   getAppointments(patientId, null)
   */
  public getAppointments(
    patientId: number,
    from: Date | null = new Date(),
  ): Promise<AppointmentResponse[]> {
    const params: {
      paciente_id: number;
      desde?: string;
    } = {
      paciente_id:
        patientId,
    };

    /**
     * Solo agregamos `desde` cuando queremos
     * limitar la consulta a citas futuras.
     */
    if (from) {
      params.desde =
        from.toISOString();
    }

    return httpClient.get(
      '/citas',
      {
        params,
      },
    );
  }

  /**
   * Catálogo de tipos de cita.
   *
   * Permite convertir:
   *
   * tipo_cita_id -> "Consulta", "Control", etc.
   *
   * No hardcodeamos IDs porque pertenecen
   * al catálogo administrado por backend.
   */
  public getAppointmentTypes():
    Promise<CatalogPage> {
    return httpClient.get(
      '/tipos-cita?limit=100',
    );
  }

  /**
   * Catálogo de estados de cita.
   *
   * Permite convertir:
   *
   * estado_cita_id -> nombre legible.
   *
   * Por ejemplo:
   * - Confirmada
   * - Pendiente
   * - Completada
   * - Cancelada
   *
   * No asumimos IDs específicos.
   */
  public getAppointmentStatuses():
    Promise<CatalogPage> {
    return httpClient.get(
      '/estados-cita?limit=100',
    );
  }

  // =========================================================
  // HEALTH INDICATOR CATALOGS
  // =========================================================

  /**
   * Catálogo de unidades de medida.
   *
   * Utilizado para transformar:
   *
   * unidad_medida_id
   *
   * en:
   *
   * mmHg, bpm, mg/dL, kg, etc.
   */
  public getMeasurementUnits():
    Promise<CatalogPage> {
    return httpClient.get(
      '/unidades-medida?limit=100',
    );
  }

  // =========================================================
  // B10 DASHBOARD
  // =========================================================

  /**
   * Construye el snapshot utilizado por Inicio y Mi Salud.
   *
   * Todas las consultas reciben EL MISMO patientId.
   *
   * Esto es especialmente importante para caregiver:
   *
   * caregiver
   *   -> selecciona María
   *   -> B09 activePatient.patientId
   *   -> B10 consulta únicamente información de María
   *
   * No debe utilizarse `/pacientes/me` aquí porque ese endpoint
   * representa al usuario autenticado y no al paciente seleccionado
   * por un caregiver.
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
    ] =
      await Promise.all([
        /**
         * Alergias + condiciones.
         */
        this.getHealthSummary(
          patientId,
        ),

        /**
         * Historial de mediciones.
         */
        healthIndicatorsApi
          .getPatientMeasurements(
            patientId,
          ),

        /**
         * Alertas pendientes.
         */
        healthIndicatorsApi
          .getPatientAlerts(
            patientId,
            true,
          ),

        /**
         * Catálogo de indicadores.
         */
        healthIndicatorsApi
          .getIndicators(),

        /**
         * Unidades de medida.
         */
        this.getMeasurementUnits(),

        /**
         * Tipos de cita.
         */
        this.getAppointmentTypes(),

        /**
         * Solo próximas citas para Inicio.
         */
        this.getAppointments(
          patientId,
          now,
        ),

        /**
         * Recetas del patientContext.
         */
        prescriptionsApi
          .getPrescriptionsByPatient(
            patientId,
          ),

        /**
         * Catálogo necesario para identificar
         * cuáles recetas están activas.
         */
        prescriptionsApi
          .getPrescriptionStatuses(),

        /**
         * Catálogo necesario para identificar
         * dosis ya tomadas.
         */
        prescriptionsApi
          .getDoseStatuses(),

        /**
         * Catálogo de medicamentos.
         */
        prescriptionsApi
          .getMedications(),
      ] as const);

    /**
     * El backend todavía no expone:
     *
     * GET /patients/{id}/next-dose
     *
     * Por eso componemos la próxima dosis
     * utilizando A07.
     */
    const nextDose =
      await this.resolveNextDose({
        prescriptions,

        prescriptionStatuses:
          prescriptionStatuses.items,

        doseStatuses:
          doseStatuses.items,

        medications,

        now,
      });

    return {
      patientId,

      healthSummary,

      measurements:
        measurements as MedicionIndicadorResponse[],

      alerts:
        alerts as AlertaClinicaResponse[],

      indicators:
        indicators as IndicadorMedicoResponse[],

      measurementUnits:
        measurementUnitsPage.items,

      appointmentTypes:
        appointmentTypesPage.items,

      appointments,

      nextDose,

      fetchedAt:
        new Date().toISOString(),
    };
  }

  // =========================================================
  // NEXT DOSE RESOLUTION
  // =========================================================

  /**
   * Calcula la próxima toma a partir de:
   *
   * Recetas
   *   -> Detalles
   *   -> Horarios
   *   -> Registros de dosis
   *
   * No utiliza `/pacientes/me`.
   *
   * Por esto funciona correctamente tanto para:
   *
   * - Paciente
   * - Caregiver autorizado
   */
  private async resolveNextDose({
    prescriptions,
    prescriptionStatuses,
    doseStatuses,
    medications,
    now,
  }: {
    prescriptions:
      RecetaResponse[];

    prescriptionStatuses:
      PrescriptionCatalogItem[];

    doseStatuses:
      PrescriptionCatalogItem[];

    medications:
      MedicamentoResponse[];

    now:
      Date;
  }): Promise<NextDose | null> {
    /**
     * Buscamos el estado "Activa" por nombre,
     * no por un ID hardcodeado.
     */
    const activeStatusId =
      this.catalogIdByName(
        prescriptionStatuses,
        'Activa',
      );

    if (
      activeStatusId ===
      undefined
    ) {
      return null;
    }

    /**
     * Buscamos también el estado "Tomada".
     */
    const takenStatusId =
      this.catalogIdByName(
        doseStatuses,
        'Tomada',
      );

    /**
     * Extraemos únicamente medicamentos
     * pertenecientes a recetas activas.
     */
    const activeDetails =
      prescriptions
        .filter(
          (prescription) =>
            prescription.estado_id ===
            activeStatusId,
        )
        .flatMap(
          (prescription) =>
            prescription.detalles.map(
              (detail) => ({
                prescriptionId:
                  prescription.id,

                detail,
              }),
            ),
        );

    if (
      activeDetails.length ===
      0
    ) {
      return null;
    }

    /**
     * Cada detalle de receta puede contener
     * uno o varios horarios.
     */
    const schedulesPerDetail =
      await Promise.all(
        activeDetails.map(
          async ({
            prescriptionId,
            detail,
          }) => ({
            prescriptionId,

            detail,

            schedules:
              await schedulesApi
                .getHorarios(
                  detail.id,
                ),
          }),
        ),
      );

    /**
     * Eliminamos horarios desactivados y
     * conservamos su relación con receta/detalle.
     */
    const candidates =
      schedulesPerDetail.flatMap(
        ({
          prescriptionId,
          detail,
          schedules,
        }) =>
          schedules
            .filter(
              (schedule) =>
                schedule.activo,
            )
            .map(
              (schedule) => ({
                prescriptionId,
                detail,
                schedule,
              }),
            ),
      );

    if (
      candidates.length ===
      0
    ) {
      return null;
    }

    /**
     * Consultamos registros de dosis de cada horario.
     */
    const logsBySchedule =
      await Promise.all(
        candidates.map(
          ({
            schedule,
          }) =>
            schedulesApi
              .getDosisLogs(
                schedule.id,
              ),
        ),
      );

    /**
     * Convertimos cada horario en una posible
     * próxima dosis.
     */
    const resolved =
      candidates.map(
        (
          candidate,
          index,
        ) => {
          const logs =
            logsBySchedule[
              index
            ] ?? [];

          /**
           * Comprobamos si esta toma ya fue
           * registrada hoy.
           */
          const takenToday =
            takenStatusId !==
              undefined &&
            this.hasTakenDoseToday(
              logs,
              takenStatusId,
              now,
            );

          /**
           * Combinamos la fecha de hoy con
           * la hora configurada.
           */
          const scheduledToday =
            this.combineDateAndTime(
              now,
              candidate.schedule,
            );

          let scheduledAt =
            scheduledToday;

          /**
           * Si la dosis de hoy ya fue tomada,
           * su próxima ocurrencia es mañana.
           *
           * Si todavía no fue tomada aunque la hora
           * ya pasó, permanece hoy y se marca atrasada.
           */
          if (takenToday) {
            scheduledAt =
              new Date(
                scheduledToday,
              );

            scheduledAt.setDate(
              scheduledAt.getDate() +
                1,
            );
          }

          const medication =
            medications.find(
              (item) =>
                item.id ===
                candidate.detail
                  .medicamento_id,
            );

          return {
            horarioId:
              candidate.schedule.id,

            detalleRecetaId:
              candidate.detail.id,

            recetaId:
              candidate
                .prescriptionId,

            medicationName:
              medication?.nombre ??
              'Medicamento',

            dose:
              candidate.detail
                .dosis,

            instructions:
              candidate.detail
                .instrucciones ??
              candidate.detail
                .frecuencia,

            scheduledAt:
              scheduledAt
                .toISOString(),

            isOverdue:
              !takenToday &&
              scheduledToday
                .getTime() <
                now.getTime(),
          } satisfies NextDose;
        },
      );

    /**
     * La dosis con fecha/hora más cercana
     * será mostrada en Inicio.
     */
    return (
      resolved.sort(
        (
          a,
          b,
        ) =>
          new Date(
            a.scheduledAt,
          ).getTime() -
          new Date(
            b.scheduledAt,
          ).getTime(),
      )[0] ??
      null
    );
  }

  // =========================================================
  // INTERNAL UTILITIES
  // =========================================================

  /**
   * Busca el ID de un catálogo usando su nombre.
   *
   * Esto evita depender de IDs específicos
   * de una instalación de base de datos.
   */
  private catalogIdByName(
    items:
      PrescriptionCatalogItem[],
    name:
      string,
  ): number | undefined {
    const target =
      this.normalize(
        name,
      );

    return items.find(
      (item) =>
        this.normalize(
          item.nombre,
        ) ===
        target,
    )?.id;
  }

  /**
   * Comprueba si un horario ya tiene una
   * dosis marcada como tomada durante hoy.
   */
  private hasTakenDoseToday(
    logs:
      DosisAdministradaResponse[],
    takenStatusId:
      number,
    today:
      Date,
  ): boolean {
    return logs.some(
      (log) =>
        log.estado_dosis_id ===
          takenStatusId &&
        this.isSameLocalDay(
          new Date(
            log.fecha_programada,
          ),
          today,
        ),
    );
  }

  /**
   * Combina:
   *
   * fecha actual + horario HH:mm:ss
   *
   * para crear una fecha programada completa.
   */
  private combineDateAndTime(
    date:
      Date,
    schedule:
      HorarioMedicamentoResponse,
  ): Date {
    const [
      hours,
      minutes,
      seconds,
    ] =
      schedule.hora
        .split(':')
        .map(
          (value) =>
            Number(value),
        );

    const result =
      new Date(
        date,
      );

    result.setHours(
      hours || 0,
      minutes || 0,
      seconds || 0,
      0,
    );

    return result;
  }

  /**
   * Compara únicamente año, mes y día
   * en la zona horaria local del dispositivo.
   */
  private isSameLocalDay(
    a:
      Date,
    b:
      Date,
  ): boolean {
    return (
      a.getFullYear() ===
        b.getFullYear() &&
      a.getMonth() ===
        b.getMonth() &&
      a.getDate() ===
        b.getDate()
    );
  }

  /**
   * Normalización utilizada al comparar
   * nombres provenientes de catálogos.
   *
   * Ejemplo:
   *
   * "Actíva" -> "activa"
   */
  private normalize(
    value:
      string,
  ): string {
    return value
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim()
      .toLocaleLowerCase(
        'es',
      );
  }
}

/**
 * Singleton utilizado por los hooks de B10.
 */
export const homeHealthService =
  new HomeHealthService();