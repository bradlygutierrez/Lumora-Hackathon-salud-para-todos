import { fireEvent, render } from '@testing-library/react-native';

import { MedicalRecordDiagnosesScreen } from '../screens/MedicalRecordDiagnosesScreen';

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
  consultas: [
    {
      consulta: {
        id: 5,
        expediente_id: 17,
        paciente_id: 9,
        profesional_id: 2,
        motivo_consulta_id: 1,
        fecha_consulta: '2026-08-24T15:30:00Z',
        motivo: 'Control',
        sintomas: null,
        evaluacion: null,
        indicaciones: null,
        observaciones: null,
        activo: true,
      },
      signos_vitales: [],
      notas: [],
      diagnosticos: [
        {
          id: 4,
          consulta_id: 5,
          expediente_id: 17,
          profesional_id: 2,
          tipo_diagnostico_id: 1,
          descripcion: 'Hipertensión primaria',
          es_principal: true,
          fecha_diagnostico: '2026-08-24',
          activo: true,
        },
      ],
    },
  ],
  recetas: [],
  mediciones: [],
  alertas: [],
};

describe('MedicalRecordDiagnosesScreen', () => {
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

  it('lists diagnoses and opens the owning consultation diagnosis screen', async () => {
    const screen = await render(
      <MedicalRecordDiagnosesScreen patientId={9} recordId={17} />,
    );

    expect(screen.getByText('Hipertensión primaria')).toBeTruthy();
    expect(screen.getByText('Principal')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Abrir diagnóstico 4'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/consultations/5/diagnoses?recordId=17',
    );
  });

  it('blocks users without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });

    const screen = await render(
      <MedicalRecordDiagnosesScreen patientId={9} recordId={17} />,
    );

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(screen.queryByText('Hipertensión primaria')).toBeNull();
  });
});
