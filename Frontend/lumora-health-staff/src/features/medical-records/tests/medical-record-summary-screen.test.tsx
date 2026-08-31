import { fireEvent, render } from '@testing-library/react-native';

import { MedicalRecordSummaryScreen } from '../screens/MedicalRecordSummaryScreen';

const mockUseMedicalRecordSummary = jest.fn();
const mockUseAuthSession = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('../hooks/use-medical-record', () => ({
  useMedicalRecordSummary: () => mockUseMedicalRecordSummary(),
}));

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
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
    notas: 'Seguimiento autorizado',
    activo: true,
  },
  antecedentes: [{ id: 1, expediente_id: 17, tipo_antecedente_id: 1, descripcion: 'Hipertensión familiar', fecha: null, activo: true }],
  alergias: [{ id: 2, paciente_id: 9, nombre: 'Penicilina', nivel_severidad_id: 3, estado_condicion_id: 1, observaciones: null, activo: true }],
  discapacidades: [],
  condiciones: [{ id: 3, expediente_id: 17, paciente_id: 9, diagnostico_id: 4, estado_condicion_id: 1, nombre: 'Hipertensión', descripcion: null, fecha_inicio: null, fecha_fin: null, activo: true }],
  consultas: [{
    consulta: { id: 5, expediente_id: 17, paciente_id: 9, profesional_id: 2, motivo_consulta_id: 1, fecha_consulta: '2026-08-24T15:30:00Z', motivo: 'Control', sintomas: null, evaluacion: null, indicaciones: null, observaciones: null, activo: true },
    signos_vitales: [],
    notas: [],
    diagnosticos: [{ id: 4, consulta_id: 5, expediente_id: 17, profesional_id: 2, tipo_diagnostico_id: 1, descripcion: 'Hipertensión primaria', es_principal: true, fecha_diagnostico: '2026-08-24', activo: true }],
  }],
  recetas: [{ id: 'rx-1', profesional_id: 2, consulta_id: 5, estado_id: 1, titulo: 'Control antihipertensivo', fecha_emision: '2026-08-24T15:45:00Z', vigencia_hasta: null }],
  mediciones: [{ id: 'm-1', indicador_id: 'i-1', indicador_nombre: 'Presión sistólica', valor: 138, unidad_medida_id: 9, unidad_medida: 'mmHg', origen_registro_id: 3, fecha_medicion: '2026-08-24T15:35:00Z', observaciones: null }],
  alertas: [{ id: 'a-1', medicion_id: 'm-1', nivel_severidad_id: 2, nivel_severidad: 'Media', tipo_alerta_id: 5, tipo_alerta: 'Medición Fuera de Rango', mensaje: 'Presión fuera de rango', atendida: false, fecha_alerta: '2026-08-24T15:36:00Z', fecha_atencion: null }],
};

describe('MedicalRecordSummaryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseMedicalRecordSummary.mockReturnValue({ data: summary, isLoading: false, isError: false });
  });

  it('composes the clinical hub from the aggregated DTO', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    expect(screen.getByText('Ana Morales')).toBeTruthy();
    expect(screen.getByText('EXP-00017')).toBeTruthy();
    expect(screen.getByText('Presión fuera de rango')).toBeTruthy();
    expect(screen.getByText('Condiciones')).toBeTruthy();
    expect(screen.getByText('Diagnósticos')).toBeTruthy();
    expect(screen.getByText('Recetas')).toBeTruthy();
    expect(screen.getByText('Indicadores')).toBeTruthy();
    expect(screen.getByText('Alertas')).toBeTruthy();
  });

  it('routes diagnoses through consultation history from the clinical summary', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Abrir sección Diagnósticos'));

    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/consultations?recordId=17',
    );
  });

  it('opens J12 structured history management from the clinical summary', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Abrir sección Condiciones'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/conditions?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir sección Alergias'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/allergies?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir sección Discapacidades'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/disabilities?recordId=17',
    );

    await fireEvent.press(screen.getByLabelText('Abrir sección Historial médico'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/history?recordId=17');
  });


  it('opens the consultation history and individual consultations from the clinical summary', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Abrir consultas del expediente'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/consultations?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir sección Consultas'));
    await fireEvent.press(screen.getByLabelText('Abrir consulta 5'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/consultations/5');
  });

  it('navigates to the medical timeline for the current record', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Abrir línea de tiempo médica'));

    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/timeline?recordId=17');
  });

  it('opens the canonical B15 document from the clinical summary', async () => {
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Abrir expediente documental'));

    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/document',
    );
  });

  it('blocks users without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('shows the backend empty state when there is no record', async () => {
    mockUseMedicalRecordSummary.mockReturnValue({
      data: { ...summary, expediente: null },
      isLoading: false,
      isError: false,
    });
    const screen = await render(<MedicalRecordSummaryScreen patientId={9} />);
    expect(screen.getByText('Sin expediente')).toBeTruthy();
  });
});
