import { fireEvent, render } from '@testing-library/react-native';

import { AgendaScreen } from '../screens/AgendaScreen';

const mockUseAuthSession = jest.fn();
const mockAgenda = jest.fn();
const mockSchedules = jest.fn();
const mockAvailability = jest.fn();
const mockMutations = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-appointments', () => ({
  useProfessionalAgenda: () => mockAgenda(),
  useProfessionalSchedules: () => mockSchedules(),
  useProfessionalAvailability: () => mockAvailability(),
  useScheduleMutations: () => mockMutations(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('AgendaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
      session: { isPreview: false },
    });
    mockAgenda.mockReturnValue({
      data: [
        {
          id: 1,
          paciente_id: 9,
          paciente_nombre: 'Ana Mora',
          inicio: '2026-09-01T14:00:00Z',
          fin: '2026-09-01T14:45:00Z',
          notas: null,
          estado: { id: 1, nombre: 'Confirmada' },
          tipo_cita: null,
          ubicacion: null,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockSchedules.mockReturnValue({
      data: [
        {
          id: 2,
          profesional_id: 7,
          dia_semana: 0,
          hora_inicio: '08:00:00',
          hora_fin: '10:00:00',
          activo: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockAvailability.mockReturnValue({
      data: { fecha: '2026-08-31', slots: [] },
      isFetching: false,
      isError: false,
    });
    mockMutations.mockReturnValue({
      create: { mutateAsync: jest.fn(), isPending: false },
      update: { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false },
      remove: { mutateAsync: jest.fn(), isPending: false },
    });
  });

  it('shows own upcoming agenda and recurring availability', async () => {
    const screen = await render(<AgendaScreen />);
    expect(screen.getByText('Ana Mora')).toBeTruthy();

    await fireEvent.press(screen.getByText('Mi disponibilidad'));
    expect(screen.getAllByText('Lunes').length).toBeGreaterThan(0);
    expect(screen.getByText('08:00–10:00')).toBeTruthy();
  });

  it('blocks users without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(),
      session: { isPreview: false },
    });
    const screen = await render(<AgendaScreen />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });
});
