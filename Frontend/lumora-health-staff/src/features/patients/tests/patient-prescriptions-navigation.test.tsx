import { fireEvent, render } from '@testing-library/react-native';

import { PatientDetailScreen } from '../screens/PatientDetailScreen';

const mockUsePatient = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUsePatientClinicalSummary = jest.fn();
const mockUseAuthSession = jest.fn();
const mockPush = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-patients', () => ({
  usePatient: () => mockUsePatient(),
  usePatientCatalogs: () => mockUsePatientCatalogs(),
  usePatientClinicalSummary: () => mockUsePatientClinicalSummary(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('PatientDetail prescription navigation J13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
    });
    mockUsePatient.mockReturnValue({
      data: {
        id: 9,
        tipo_sangre_id: null,
        alergias: null,
        persona: {
          id: 20,
          nombres: 'Ana',
          apellidos: 'Prueba',
          fecha_nacimiento: '1988-01-01',
          telefono: null,
          email: null,
          sexo_id: null,
          direcciones: [],
        },
        contactos_emergencia: [],
      },
      isLoading: false,
      isError: false,
    });
    mockUsePatientCatalogs.mockReturnValue({
      sexes: { data: { items: [] } },
      bloodTypes: { data: { items: [] } },
    });
    mockUsePatientClinicalSummary.mockReturnValue({
      data: {
        paciente_id: 9,
        expediente: {
          id: 17,
          paciente_id: 9,
          estado_expediente_id: 1,
          numero_expediente: 'EXP-17',
          notas: null,
          activo: true,
        },
      },
      isLoading: false,
      isError: false,
    });
  });

  it('opens patient prescriptions with the available medical record context', async () => {
    const screen = await render(<PatientDetailScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Ver recetas del paciente'));

    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/prescriptions?recordId=17',
    );
  });
});
