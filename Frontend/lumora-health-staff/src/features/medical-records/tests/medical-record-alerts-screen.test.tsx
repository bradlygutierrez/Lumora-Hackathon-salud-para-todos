import { fireEvent, render } from '@testing-library/react-native';

import { MedicalRecordAlertsScreen } from '../screens/MedicalRecordAlertsScreen';

const mockUseAuthSession = jest.fn();
const mockUseMedicalRecordSummary = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../hooks/use-medical-record', () => ({
  useMedicalRecordSummary: () => mockUseMedicalRecordSummary(),
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

const summary = {
  paciente_id: 9,
  paciente: {
    id: 81,
    nombres: 'Ana',
    apellidos: 'Morales',
    fecha_nacimiento: '1988-06-14',
    sexo_id: 2,
  },
  expediente: {
    id: 17,
    paciente_id: 9,
    estado_expediente_id: 1,
    numero_expediente: 'EXP-00017',
    notas: null,
    activo: true,
  },
  antecedentes: [],
  alergias: [],
  discapacidades: [],
  condiciones: [],
  consultas: [],
  recetas: [],
  mediciones: [],
  alertas: [
    {
      id: 'a-1',
      medicion_id: 'm-1',
      nivel_severidad_id: 2,
      nivel_severidad: 'Media',
      tipo_alerta_id: 5,
      tipo_alerta: 'Medición Fuera de Rango',
      mensaje: 'Presión fuera de rango',
      atendida: false,
      fecha_alerta: '2026-08-24T15:36:00Z',
      fecha_atencion: null,
    },
  ],
};

describe('MedicalRecordAlertsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
    });
    mockUseMedicalRecordSummary.mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    });
  });

  it('shows backend alerts and links to measurement history', async () => {
    const screen = await render(
      <MedicalRecordAlertsScreen patientId={9} recordId={17} />,
    );

    expect(screen.getByText('Medición Fuera de Rango')).toBeTruthy();
    expect(screen.getByText('Presión fuera de rango')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();

    await fireEvent.press(
      screen.getByLabelText('Ver historial de mediciones desde alertas'),
    );
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/measurements');
  });

  it('blocks users without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });

    const screen = await render(
      <MedicalRecordAlertsScreen patientId={9} recordId={17} />,
    );

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(screen.queryByText('Presión fuera de rango')).toBeNull();
  });
});
