import {
  actionForAlert,
  HEALTH_ALERT_CATEGORY_VARIANTS,
  secondaryActionForAlert,
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
    indicador_id: null,
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

  it('sends alerta_clinica to the indicador history when indicador_id is present', () => {
    const action = actionForAlert(
      alert({ tipo: 'alerta_clinica', indicador_id: 'indicador-1' }),
    );
    expect(action.label).toBe('Ver Medición Completa');
    expect(action.href).toEqual({
      pathname: '/(app)/health-indicators/[indicadorId]/history',
      params: { indicadorId: 'indicador-1' },
    });
  });

  it('falls back to the indicador selector when alerta_clinica has no indicador_id', () => {
    const action = actionForAlert(alert({ tipo: 'alerta_clinica', indicador_id: null }));
    expect(action.href).toBe('/(app)/health-indicators');
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

  it('offers a disabled "Contactar Médico" secondary action only for alerta_clinica', () => {
    const clinica = secondaryActionForAlert(alert({ tipo: 'alerta_clinica' }));
    expect(clinica).toEqual({ label: 'Contactar Médico', disabled: true });

    expect(secondaryActionForAlert(alert({ tipo: 'dosis_omitida' }))).toBeNull();
    expect(secondaryActionForAlert(alert({ tipo: 'cita_proxima' }))).toBeNull();
  });
});
