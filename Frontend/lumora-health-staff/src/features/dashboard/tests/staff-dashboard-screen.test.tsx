import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import StaffDashboardScreen from '@/app/(staff)/index';

const mockUseAuthSession = jest.fn();
const mockUseProfessionalAgenda = jest.fn();
const mockUseMyPatients = jest.fn();
const mockPush = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('@/src/features/appointments/hooks/use-appointments', () => ({
  useProfessionalAgenda: () => mockUseProfessionalAgenda(),
}));
jest.mock('@/src/features/patients/hooks/use-my-patients', () => ({
  useMyPatients: () => mockUseMyPatients(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const mockStartTour = jest.fn();
jest.mock('@wrack/react-native-tour-guide', () => {
  const React = jest.requireActual('react');
  return {
    TourTarget: ({ children }: { id: string; children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useTourPersistence: () => ({ startTour: mockStartTour }),
  };
});
jest.mock('@/src/shared/components/AppTopBar', () => ({ AppTopBar: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// El dashboard usa useQueryClient() para su pull-to-refresh (RefreshControl
// del ScrollView) -- regresión: ese hook no tenía QueryClientProvider en la
// app real hasta que se conectó refreshControl; sin uno, este componente
// nunca podía montar. Se prueba con un QueryClient real, no un mock.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StaffDashboardScreen />
    </QueryClientProvider>,
  );
}

describe('StaffDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
      session: { user: { username: 'doctor', persona: { nombres: 'Ana Mora' } } },
    });
    mockUseProfessionalAgenda.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockUseMyPatients.mockReturnValue({ data: [], isLoading: false });
  });

  it('mounts with a real QueryClientProvider instead of crashing on useQueryClient()', async () => {
    // Regresión: el dashboard llama useQueryClient() para su pull-to-refresh
    // (ver RefreshControl en app/(staff)/index.tsx); sin un
    // QueryClientProvider ancestro, ni siquiera monta.
    const screen = await renderScreen();
    expect(screen.getByText('Hola, Ana')).toBeTruthy();
  });

  it('shows the upcoming agenda and quick access shortcuts', async () => {
    mockUseProfessionalAgenda.mockReturnValue({
      data: [
        {
          id: 1,
          paciente_id: 9,
          paciente_nombre: 'Luis Paz',
          inicio: '2026-09-05T14:00:00Z',
          fin: '2026-09-05T14:30:00Z',
          notas: null,
          estado: null,
          tipo_cita: null,
          ubicacion: null,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const screen = await renderScreen();
    expect(screen.getByText('Luis Paz')).toBeTruthy();
    expect(screen.getByLabelText('Abrir Pacientes')).toBeTruthy();
  });

  it('opens the appointment detail, not the patient file, when tapping an upcoming appointment', async () => {
    // Regresión: esta fila abría directo la ficha del paciente
    // (/(staff)/patients/{id}), así que nunca se podía ver el estado real
    // de la cita (pendiente/confirmada/etc.), que solo se muestra en
    // AppointmentDetailScreen.
    mockUseProfessionalAgenda.mockReturnValue({
      data: [
        {
          id: 42,
          paciente_id: 9,
          paciente_nombre: 'Luis Paz',
          inicio: '2026-09-05T14:00:00Z',
          fin: '2026-09-05T14:30:00Z',
          notas: null,
          estado: null,
          tipo_cita: null,
          ubicacion: null,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Abrir cita de Luis Paz'));

    expect(mockPush).toHaveBeenCalledWith('/(staff)/appointments/42');
  });

  it('starts the dashboard tour with the expected steps', async () => {
    const screen = await renderScreen();

    expect(mockStartTour).toHaveBeenCalledTimes(1);
    const [steps, config] = mockStartTour.mock.calls[0];
    expect(config.tourId).toBe('staff-dashboard-tour');
    // Regresión: sin scrollRef, el tour no desplaza la pantalla hasta un
    // paso que está más abajo del viewport inicial (ej. "Próximas
    // citas"), dejando el tooltip desfasado de la sección real.
    const agendaStep = steps.find(
      (step: { id: string }) => step.id === 'agenda',
    );
    const patientsTabStep = steps.find(
      (step: { id: string }) => step.id === 'navigation-patients',
    );
    expect(agendaStep.scrollToTarget.scrollRef).toBeDefined();
    expect(patientsTabStep.scrollToTarget).toBeUndefined();
    fireEvent.scroll(screen.getByTestId('staff-dashboard-scroll'), {
      nativeEvent: { contentOffset: { y: 240 } },
    });
    expect(agendaStep.scrollToTarget.getCurrentScrollOffset()).toBe(240);
    expect(steps.map((step: { targetId: string }) => step.targetId)).toEqual([
      'tour-stats',
      'tour-quick-access',
      'tour-agenda',
      'tour-tab-patients',
      'tour-tab-agenda',
      'tour-tab-directory',
      'tour-tab-profile',
    ]);
  });

  it('only includes administration in the tour for authorized staff', async () => {
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage', 'rbac:manage']),
      session: { user: { username: 'admin', persona: { nombres: 'Ana Mora' } } },
    });

    await renderScreen();

    const [steps] = mockStartTour.mock.calls[0];
    expect(steps.map((step: { targetId: string }) => step.targetId)).toContain(
      'tour-tab-administration',
    );
  });
});
