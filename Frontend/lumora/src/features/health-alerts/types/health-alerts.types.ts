/**
 * Tipos de la feature de Alertas de Salud (A09).
 *
 * Reflejan literalmente el schema Pydantic del backend
 * (Backend/src/lumora_api/schemas/health_alerts.py). Nada de esto se
 * persiste en la base de datos: el backend lo calcula al vuelo a partir
 * de alertas clinicas reales, horarios de medicamento y citas (ver
 * Backend/.../services/health_alerts_service.py). No se inventan campos
 * que el backend no devuelve.
 */

export type HealthAlertTipo = 'alerta_clinica' | 'dosis_omitida' | 'cita_proxima';

export type HealthAlertCategoria = 'alta_severidad' | 'preventiva' | 'recordatorio';

export type HealthAlertResponse = {
  id: string;
  tipo: HealthAlertTipo;
  categoria: HealthAlertCategoria;
  titulo: string;
  mensaje: string;
  fecha: string;
  atendida: boolean;
  alerta_id: string | null;
  medicion_id: string | null;
  horario_id: string | null;
  cita_id: number | null;
};
