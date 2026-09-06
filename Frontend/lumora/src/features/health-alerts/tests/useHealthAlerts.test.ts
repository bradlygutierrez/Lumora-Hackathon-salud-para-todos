jest.mock('@/features/health-alerts/api/health-alerts-api', () => ({
  healthAlertsApi: {
    getPatientAlerts: jest.fn(),
  },
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { healthAlertsApi } from '@/features/health-alerts/api/health-alerts-api';
import { useHealthAlerts } from '@/features/health-alerts/hooks/useHealthAlerts';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

describe('useHealthAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alerts for the active patient once patientContext is ready', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    (healthAlertsApi.getPatientAlerts as jest.Mock).mockResolvedValue([
      {
        id: 'alerta:1',
        tipo: 'alerta_clinica',
        categoria: 'alta_severidad',
        titulo: 'Presión Arterial Fuera de Rango',
        mensaje: 'Fuera de rango.',
        fecha: '2026-08-26T08:00:00Z',
        atendida: false,
        alerta_id: '1',
        medicion_id: 'm-1',
        horario_id: null,
        cita_id: null,
      },
    ]);

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useHealthAlerts(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(healthAlertsApi.getPatientAlerts).toHaveBeenCalledWith(7);
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].tipo).toBe('alerta_clinica');
    expect(result.current.isError).toBe(false);
  });

  it('does not call the API while patientContext is still resolving', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'loading',
      role: 'patient',
      activePatient: undefined,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useHealthAlerts(), {
      wrapper: createQueryWrapper(client),
    });

    expect(healthAlertsApi.getPatientAlerts).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces patientContext errors even without a query error', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'error',
      role: 'patient',
      activePatient: undefined,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useHealthAlerts(), {
      wrapper: createQueryWrapper(client),
    });

    expect(result.current.isError).toBe(true);
  });
});
