import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.native ?? specifics.default,
  },
  Pressable: 'Pressable',
  StyleSheet: { flatten: (style: unknown) => style ?? {} },
  Text: 'Text',
  View: 'View',
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/shared/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/shared/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/shared/components/SurfaceCard', () => ({
  SurfaceCard: ({ children }: { children: React.ReactNode }) => {
    const ReactRuntime = require('react') as typeof import('react');
    return ReactRuntime.createElement('View', null, children);
  },
}));
jest.mock('@/features/home-health/components/ClinicalAlertCard', () => ({ ClinicalAlertCard: () => null }));
jest.mock('@/features/home-health/components/HealthMetricTile', () => ({ HealthMetricTile: () => null }));
jest.mock('@/features/home-health/components/HomeHealthState', () => ({ HomeHealthState: () => null }));
jest.mock('@/features/home-health/components/NextAppointmentCard', () => ({ NextAppointmentCard: () => null }));
jest.mock('@/features/shell/hooks/useShellContext', () => ({ useShellContext: jest.fn() }));
jest.mock('@/features/home-health/hooks/useHomeHealthDashboard', () => ({
  useHomeHealthDashboard: jest.fn(),
}));

import HealthRoute from '@/app/(app)/(tabs)/health';
import { useHomeHealthDashboard } from '@/features/home-health/hooks/useHomeHealthDashboard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { ApiError } from '@/shared/api/api-error';

const refetch = jest.fn();

const dashboardData = {
  patientId: 7,
  healthSummary: { patient_id: 7, allergies: [], active_conditions: [] },
  measurements: [],
  alerts: [],
  indicators: [],
  measurementUnits: [],
  appointmentTypes: [],
  appointments: [],
  nextDose: null,
  fetchedAt: '2026-01-01T00:00:00Z',
};

function dashboardWith(error: ApiError | null) {
  return {
    data: error ? undefined : dashboardData,
    error,
    isError: Boolean(error),
    isLoading: false,
    refetch,
  };
}

describe('Mi Salud B13 final resilience and accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useShellContext as jest.Mock).mockReturnValue({
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Paciente de prueba' },
    });
  });

  it.each([
    ['NETWORK_ERROR', null, /Sin conexi/, true],
    ['SERVER_ERROR', 500, /No pudimos completar/, true],
    ['FORBIDDEN', 403, /permiso/, false],
    ['NOT_FOUND', 404, /información no encontrada/i, false],
  ] as const)('presenta el estado correcto para %s', async (code, status, expected, canRetry) => {
    const error = new ApiError(code, status, 'internal');
    (useHomeHealthDashboard as jest.Mock).mockReturnValue(dashboardWith(error));
    const view = await render(<HealthRoute />);

    expect(view.getByText(expected)).toBeTruthy();
    expect(Boolean(view.queryByLabelText('Reintentar'))).toBe(canRetry);
    if (error.code === 'FORBIDDEN') {
      expect(view.queryByText(/conexi/)).toBeNull();
    }
  });

  it('expone los controles de Mi Salud con semántica accesible', async () => {
    (useHomeHealthDashboard as jest.Mock).mockReturnValue(dashboardWith(null));
    const view = await render(<HealthRoute />);

    const register = view.getByLabelText('Registrar indicador');
    expect(register.props.accessibilityRole).toBe('button');
    expect(register.props.className).toContain('h-12');
    expect(register.props.className).toContain('w-12');

    const resumen = view.getByText('Resumen').parent;
    expect(resumen?.props.accessibilityRole).toBe('tab');
    expect(resumen?.props.accessibilityState).toEqual({ selected: true });

    const indicadores = view.getByText('Indicadores').parent;
    expect(indicadores?.props.accessibilityRole).toBe('button');

    await act(() => fireEvent.press(view.getByText('Condiciones')));
    const condiciones = view.getByText('Condiciones').parent;
    expect(condiciones?.props.accessibilityState).toEqual({ selected: true });
  });
});
