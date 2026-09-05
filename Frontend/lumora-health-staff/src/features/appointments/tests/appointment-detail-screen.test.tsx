import { fireEvent, render } from '@testing-library/react-native';

import { AppointmentDetailScreen } from '../screens/AppointmentDetailScreen';

const mockUseAuthSession = jest.fn();
const mockUseAppointment = jest.fn();
const mockUsePatient = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-appointments', () => ({
  useAppointment: (id: number) => mockUseAppointment(id),
}));
jest.mock('@/src/features/patients/hooks/use-patients', () => ({
  usePatient: (id: number) => mockUsePatient(id),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const appointment = {
  id: 4,
  paciente_id: 9,
  profesional_id: 8,
  tipo_cita_id: 1,
  estado_cita_id: 1,
  inicio: '2026-09-05T14:00:00Z',
  fin: '2026-09-05T14:45:00Z',
  notas: 'Traer resultados de laboratorio.',
  ubicacion_id: 2,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  professional: { id: 8, full_name: 'Dra. Ana Ríos', specialty: 'Medicina interna', profile_image_url: null },
  status: { id: 1, nombre: 'Confirmada' },
  appointment_type: { id: 1, nombre: 'Control' },
  location: { id: 2, nombre: 'Clínica Central', direccion: 'Managua', consultorio: '4B', latitud: null, longitud: null },
};

describe('AppointmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseAppointment.mockReturnValue({ data: appointment, isLoading: false, isError: false });
    mockUsePatient.mockReturnValue({
      data: { id: 9, persona: { nombres: 'John', apellidos: 'Doe' } },
      isLoading: false,
      isError: false,
    });
  });

  it('blocks staff without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<AppointmentDetailScreen appointmentId={4} />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('shows an error state when the appointment cannot be loaded', async () => {
    mockUseAppointment.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const screen = await render(<AppointmentDetailScreen appointmentId={4} />);
    expect(screen.getByText('No se pudo cargar la cita')).toBeTruthy();
  });

  it('shows patient, professional, location and notes, and navigates to the patient record', async () => {
    const screen = await render(<AppointmentDetailScreen appointmentId={4} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Dra. Ana Ríos')).toBeTruthy();
    expect(screen.getByText('Medicina interna')).toBeTruthy();
    expect(screen.getByText('Clínica Central')).toBeTruthy();
    expect(screen.getByText('4B')).toBeTruthy();
    expect(screen.getByText('Confirmada')).toBeTruthy();
    expect(screen.getByText('Control')).toBeTruthy();
    expect(screen.getByText('Traer resultados de laboratorio.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ver ficha del paciente'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9');
  });

  it('falls back to a placeholder name while the patient is still loading', async () => {
    mockUsePatient.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const screen = await render(<AppointmentDetailScreen appointmentId={4} />);
    expect(screen.getByText('Paciente #9')).toBeTruthy();
  });
});
