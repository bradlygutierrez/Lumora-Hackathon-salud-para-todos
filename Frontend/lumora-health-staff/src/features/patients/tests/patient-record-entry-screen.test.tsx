import { render } from '@testing-library/react-native';

import { PatientRecordEntryScreen } from '../screens/PatientRecordEntryScreen';

const mockUsePatientClinicalSummary = jest.fn();
const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../hooks/use-patients', () => ({
  usePatientClinicalSummary: () => mockUsePatientClinicalSummary(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('PatientRecordEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
  });

  it('uses the real clinical summary as the J09 handoff to the medical record', async () => {
    mockUsePatientClinicalSummary.mockReturnValue({
      data: {
        paciente_id: 9,
        expediente: {
          id: 17,
          paciente_id: 9,
          estado_expediente_id: 1,
          numero_expediente: 'EXP-00017',
          notas: 'Seguimiento autorizado',
          activo: true,
        },
      },
      isLoading: false,
      isError: false,
    });

    const screen = await render(<PatientRecordEntryScreen patientId={9} />);
    expect(screen.getByText('EXP-00017')).toBeTruthy();
    expect(screen.getByText('Seguimiento autorizado')).toBeTruthy();
    expect(screen.queryByText(/medicación activa/i)).toBeNull();
  });

  it('does not fabricate a record when backend has none', async () => {
    mockUsePatientClinicalSummary.mockReturnValue({
      data: { paciente_id: 9, expediente: null },
      isLoading: false,
      isError: false,
    });
    const screen = await render(<PatientRecordEntryScreen patientId={9} />);
    expect(screen.getByText('El paciente no tiene expediente clínico disponible.')).toBeTruthy();
  });
});
