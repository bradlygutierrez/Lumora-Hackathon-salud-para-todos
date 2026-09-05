import { render } from '@testing-library/react-native';

const mockStartTour = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@wrack/react-native-tour-guide', () => {
  const ReactRuntime = require('react') as typeof import('react');
  return {
    TourTarget: ({ children }: { id: string; children: React.ReactNode }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    useTourPersistence: () => ({ startTour: mockStartTour }),
  };
});
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
jest.mock('@/features/home-health/components/NextAppointmentCard', () => ({
  NextAppointmentCard: () => null,
}));
jest.mock('@/features/home-health/components/NextDoseCard', () => ({ NextDoseCard: () => null }));
jest.mock('@/features/shell/hooks/useShellContext', () => ({ useShellContext: jest.fn() }));
jest.mock('@/features/home-health/hooks/useHomeHealthDashboard', () => ({
  useHomeHealthDashboard: jest.fn(),
}));

import HomeRoute from '@/app/(app)/(tabs)/index';
import { useHomeHealthDashboard } from '@/features/home-health/hooks/useHomeHealthDashboard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

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

describe('Home dashboard tour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHomeHealthDashboard as jest.Mock).mockReturnValue({
      data: dashboardData,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('starts the home tour with the expected steps for a patient', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Paciente de prueba' },
    });

    await render(<HomeRoute />);

    expect(mockStartTour).toHaveBeenCalledTimes(1);
    const [steps, config] = mockStartTour.mock.calls[0];
    expect(config).toEqual({ tourId: 'home-tour' });
    expect(steps.map((step: { targetId: string }) => step.targetId)).toEqual([
      'tour-next-dose',
      'tour-next-appointment',
      'tour-health-summary',
      'tour-quick-actions',
    ]);
  });

  it('does not start the patient tour for a caregiver session', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      role: 'caregiver',
      activePatient: { patientId: 7, displayName: 'Paciente de prueba' },
    });

    await render(<HomeRoute />);

    expect(mockStartTour).not.toHaveBeenCalled();
  });

  it('still renders the tour target sections normally', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Paciente de prueba' },
    });

    const screen = await render(<HomeRoute />);

    expect(screen.getByText('Próxima dosis')).toBeTruthy();
    expect(screen.getByText('Próxima cita')).toBeTruthy();
    expect(screen.getByText('Mi salud')).toBeTruthy();
    expect(screen.getByText('Acciones rápidas')).toBeTruthy();
  });
});
