import { fireEvent, render } from '@testing-library/react-native';

import { PatientDetailScreen } from '../screens/PatientDetailScreen';

const mockUsePatient = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUsePatientClinicalSummary = jest.fn();
const mockUseMedicalRecordSummary = jest.fn();
const mockUseMyPatients = jest.fn();
const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseProfessionalAgenda = jest.fn();
const mockUsePatientMeasurements = jest.fn();
const mockUseMeasurementCatalogs = jest.fn();
const mockPush = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('@/src/features/medical-records/hooks/use-medical-record', () => ({
  useMedicalRecordSummary: () => mockUseMedicalRecordSummary(),
}));
jest.mock('@/src/features/profile/hooks/use-professionals', () => ({
  useCurrentProfessional: () => mockUseCurrentProfessional(),
}));
jest.mock('@/src/features/appointments/hooks/use-appointments', () => ({
  useProfessionalAgenda: () => mockUseProfessionalAgenda(),
}));
jest.mock('@/src/features/measurements/hooks/use-measurements', () => ({
  usePatientMeasurements: () => mockUsePatientMeasurements(),
  useMeasurementCatalogs: () => mockUseMeasurementCatalogs(),
}));
jest.mock('../hooks/use-my-patients', () => ({
  useMyPatients: () => mockUseMyPatients(),
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
jest.mock('@/src/shared/components/AppTopBar', () => ({
  AppTopBar: () => null,
}));
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
    mockUseMedicalRecordSummary.mockImplementation(() => mockUsePatientClinicalSummary());
    mockUseMyPatients.mockReturnValue({ data: [] });
    mockUseCurrentProfessional.mockReturnValue({ data: undefined });
    mockUseProfessionalAgenda.mockReturnValue({ data: [] });
    mockUsePatientMeasurements.mockReturnValue({ data: [] });
    mockUseMeasurementCatalogs.mockReturnValue({
      indicators: { data: [] },
      units: { data: { items: [] } },
      origins: { data: { items: [] } },
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
