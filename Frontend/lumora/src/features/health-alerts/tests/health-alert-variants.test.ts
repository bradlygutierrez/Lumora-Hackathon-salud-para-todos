import {
  actionForAlert,
  HEALTH_ALERT_CATEGORY_VARIANTS,
} from '@/features/health-alerts/utils/health-alert-variants';
import type { HealthAlertResponse } from '@/features/health-alerts/types/health-alerts.types';

function alert(overrides: Partial<HealthAlertResponse>): HealthAlertResponse {
  return {
    id: 'alerta:1',
    tipo: 'alerta_clinica',
    categoria: 'alta_severidad',
    titulo: 'Título',
    mensaje: 'Mensaje',
    fecha: '2026-08-26T08:00:00Z',
    atendida: false,
    alerta_id: null,
    medicion_id: null,
    horario_id: null,
    cita_id: null,
    ...overrides,
  };
}

describe('health-alert-variants', () => {
  it('defines a visual variant for every categoria', () => {
    expect(Object.keys(HEALTH_ALERT_CATEGORY_VARIANTS).sort()).toEqual(
      ['alta_severidad', 'preventiva', 'recordatorio'].sort(),
    );
  });

  it('sends alerta_clinica to Mi salud', () => {
    const action = actionForAlert(alert({ tipo: 'alerta_clinica' }));
    expect(action.href).toBe('/(app)/(tabs)/health');
  });

  it('sends dosis_omitida to Medicación, to register the dose', () => {
    const action = actionForAlert(alert({ tipo: 'dosis_omitida', categoria: 'preventiva' }));
    expect(action.href).toBe('/(app)/(tabs)/medication');
    expect(action.label).toBe('Registrar Ahora');
  });

  it('sends cita_proxima to Citas', () => {
    const action = actionForAlert(alert({ tipo: 'cita_proxima', categoria: 'recordatorio' }));
    expect(action.href).toBe('/(app)/(tabs)/appointments');
  });
});
