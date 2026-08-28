import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

import type {
  ActiveConditionSummary,
  AllergySummary,
  AppointmentResponse,
  CatalogItem,
  HealthMetric,
  NextDose,
} from '@/features/home-health/types/home-health.types';

/**
 * Reglas puras de presentación para B10.
 *
 * Mantenerlas en una clase evita duplicar formato/ordenamiento entre
 * Inicio y Mi Salud y permite probarlas sin montar componentes React.
 */
export class HomeHealthPresenter {
  /** Obtiene el primer nombre legible del patientContext. */
  public firstName(displayName: string): string {
    return displayName.trim().split(/\s+/)[0] || displayName;
  }

  /** Saludo dependiente de la hora local del dispositivo. */
  public greeting(displayName: string, now = new Date()): string {
    const hour = now.getHours();
    const name = this.firstName(displayName);

    if (hour < 12) {
      return `¡Buenos días, ${name}!`;
    }

    if (hour < 18) {
      return `¡Buenas tardes, ${name}!`;
    }

    return `¡Buenas noches, ${name}!`;
  }

  /** Devuelve la próxima cita futura, independientemente del orden API. */
  public nextAppointment(
    appointments: AppointmentResponse[],
    now = new Date(),
  ): AppointmentResponse | null {
    const nowTime = now.getTime();

    return (
      [...appointments]
        .filter((item) => new Date(item.inicio).getTime() >= nowTime)
        .sort(
          (a, b) =>
            new Date(a.inicio).getTime() -
            new Date(b.inicio).getTime(),
        )[0] ?? null
    );
  }

  /** Nombre de tipo de cita sin hardcodear IDs de catálogo. */
  public appointmentTypeName(
    appointment: AppointmentResponse,
    appointmentTypes: CatalogItem[],
  ): string {
    if (appointment.tipo_cita_id === null) {
      return 'Consulta médica';
    }

    return (
      appointmentTypes.find(
        (item) => item.id === appointment.tipo_cita_id,
      )?.nombre ?? 'Consulta médica'
    );
  }

  /** Fecha/hora breve, pensada para tarjetas móviles. */
  public formatAppointmentDate(iso: string): string {
    const date = new Date(iso);

    return new Intl.DateTimeFormat('es-NI', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  /** Hora compacta para la tarjeta de próxima dosis. */
  public formatTime(iso: string): string {
    return new Intl.DateTimeFormat('es-NI', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  /** Etiqueta relativa sin depender de librerías externas de fechas. */
  public doseTimingLabel(nextDose: NextDose, now = new Date()): string {
    const scheduled = new Date(nextDose.scheduledAt);
    const diffMinutes = Math.round(
      (scheduled.getTime() - now.getTime()) / 60_000,
    );

    if (nextDose.isOverdue || diffMinutes < 0) {
      return 'Pendiente';
    }

    if (diffMinutes <= 60) {
      return diffMinutes <= 1 ? 'Ahora' : `En ${diffMinutes} min`;
    }

    const sameDay =
      scheduled.getFullYear() === now.getFullYear() &&
      scheduled.getMonth() === now.getMonth() &&
      scheduled.getDate() === now.getDate();

    if (sameDay) {
      return `Hoy, ${this.formatTime(nextDose.scheduledAt)}`;
    }

    return `Mañana, ${this.formatTime(nextDose.scheduledAt)}`;
  }

  /**
   * Selecciona una sola medición, la más reciente, por indicador.
   * Luego aplica prioridad visual a los indicadores que aparecen en Figma.
   */
  public latestMetrics(
    measurements: MedicionIndicadorResponse[],
    indicators: IndicadorMedicoResponse[],
    units: CatalogItem[],
    alerts: AlertaClinicaResponse[],
    limit = 4,
  ): HealthMetric[] {
    const latestByIndicator = new Map<string, MedicionIndicadorResponse>();

    for (const measurement of [...measurements].sort(
      (a, b) =>
        new Date(b.fecha_medicion).getTime() -
        new Date(a.fecha_medicion).getTime(),
    )) {
      if (!latestByIndicator.has(measurement.indicador_id)) {
        latestByIndicator.set(measurement.indicador_id, measurement);
      }
    }

    const alertMeasurementIds = new Set(
      alerts.map((item) => item.medicion_id),
    );

    return [...latestByIndicator.values()]
      .map((measurement) => {
        const indicator = indicators.find(
          (item) => item.id === measurement.indicador_id,
        );
        const unit = units.find(
          (item) => item.id === measurement.unidad_medida_id,
        );

        return {
          indicatorId: measurement.indicador_id,
          name: indicator?.nombre ?? 'Indicador',
          value: this.formatNumericValue(measurement.valor),
          unit: unit?.nombre ?? '',
          measuredAt: measurement.fecha_medicion,
          hasAlert: alertMeasurementIds.has(measurement.id),
        } satisfies HealthMetric;
      })
      .sort(
        (a, b) =>
          this.metricPriority(a.name) - this.metricPriority(b.name),
      )
      .slice(0, limit);
  }

  /** Alergia de mayor severidad disponible para el resumen visual. */
  public primaryAllergy(allergies: AllergySummary[]): AllergySummary | null {
    if (allergies.length === 0) {
      return null;
    }

    const severityRank = (severity: string | null): number => {
      const normalized = this.normalize(severity ?? '');

      if (/severa|severo|alta|critica|critico/.test(normalized)) {
        return 0;
      }

      if (/moderada|moderado|media/.test(normalized)) {
        return 1;
      }

      return 2;
    };

    return [...allergies].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity),
    )[0];
  }

  /** Condiciones ya vienen filtradas como activas desde el backend B10. */
  public activeConditions(
    conditions: ActiveConditionSummary[],
  ): ActiveConditionSummary[] {
    return [...conditions];
  }

  /** Fecha legible de diagnóstico para Condiciones. */
  public conditionDate(condition: ActiveConditionSummary): string | null {
    if (!condition.diagnosed_at) {
      return null;
    }

    return new Intl.DateTimeFormat('es-NI', {
      year: 'numeric',
    }).format(new Date(`${condition.diagnosed_at}T00:00:00`));
  }

  /** Fecha de última sincronización mostrada en Inicio cuidador. */
  public formatLastUpdate(iso: string): string {
    return new Intl.DateTimeFormat('es-NI', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  private formatNumericValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private metricPriority(name: string): number {
    const normalized = this.normalize(name);

    if (normalized.includes('presion')) return 0;
    if (normalized.includes('frecuencia')) return 1;
    if (normalized.includes('glucosa')) return 2;
    if (normalized.includes('peso')) return 3;
    if (normalized.includes('oxigen')) return 4;
    if (normalized.includes('temperatura')) return 5;

    return 10;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }
}

export const homeHealthPresenter = new HomeHealthPresenter();
