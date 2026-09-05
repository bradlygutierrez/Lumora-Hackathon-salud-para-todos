import { fireEvent, render } from '@testing-library/react-native';

import { PatientDetailScreen } from '../screens/PatientDetailScreen';
import { PatientFamilyScreen } from '../screens/PatientFamilyScreen';

const mockUsePatient = jest.fn();
const mockUsePatientFamily = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUsePatientClinicalSummary = jest.fn();
const mockUseMedicalRecordSummary = jest.fn();
const mockUseMyPatients = jest.fn();
const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseProfessionalAgenda = jest.fn();
const mockUseNextPatientAppointment = jest.fn();
const mockUsePatientMeasurements = jest.fn();
const mockUseMeasurementCatalogs = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

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
  useNextPatientAppointment: () => mockUseNextPatientAppointment(),
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
  usePatientFamily: () => mockUsePatientFamily(),
  usePatientCatalogs: () => mockUsePatientCatalogs(),
  usePatientClinicalSummary: () => mockUsePatientClinicalSummary(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

const detail = {
  id: 9,
  tipo_sangre_id: 3,
  alergias: 'Penicilina',
  persona: {
    id: 20,
    nombres: 'John',
    apellidos: 'Doe',
    fecha_nacimiento: '1981-08-20',
    telefono: '555-1234',
    email: 'john@example.com',
    sexo_id: 1,
    direcciones: [],
  },
  contactos_emergencia: [
    { id: 5, paciente_id: 9, nombre: 'Jane Doe', parentesco: 'Cónyuge', telefono: '555-9876', email: null },
  ],
};

function defaults() {
  mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
  mockUsePatient.mockReturnValue({ data: detail, isLoading: false, isError: false });
  mockUsePatientCatalogs.mockReturnValue({
    sexes: { data: { items: [{ id: 1, nombre: 'Masculino' }] }, isLoading: false, isError: false },
    bloodTypes: { data: { items: [{ id: 3, nombre: 'O+' }] }, isLoading: false, isError: false },
  });
  mockUsePatientClinicalSummary.mockReturnValue({
    data: {
      paciente_id: 9,
      expediente: { id: 17, paciente_id: 9, estado_expediente_id: 1, numero_expediente: 'EXP-17', notas: null, activo: true },
      consultas: [
        {
          consulta: {
            id: 31,
            expediente_id: 17,
            paciente_id: 9,
            profesional_id: 8,
            motivo_consulta_id: null,
            fecha_consulta: '2026-08-20T10:00:00Z',
            motivo: null,
            sintomas: null,
            evaluacion: null,
            indicaciones: null,
            observaciones: null,
            activo: true,
          },
          signos_vitales: [
            {
              id: 1,
              consulta_id: 31,
              temperatura_c: 37,
              frecuencia_cardiaca: 72,
              frecuencia_respiratoria: 18,
              presion_sistolica: 120,
              presion_diastolica: 80,
              saturacion_oxigeno: 98,
              peso_kg: 74,
              talla_cm: 178,
              glucosa_mg_dl: 92,
              registrado_at: '2026-08-20T10:05:00Z',
            },
          ],
          notas: [],
          diagnosticos: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  });
  mockUseMedicalRecordSummary.mockImplementation(() => mockUsePatientClinicalSummary());
  mockUseCurrentProfessional.mockReturnValue({ data: { id: 8 } });
  mockUseProfessionalAgenda.mockReturnValue({
    data: [
      {
        id: 4,
        paciente_id: 9,
        paciente_nombre: 'John Doe',
        inicio: '2026-09-02T14:00:00Z',
        fin: '2026-09-02T14:45:00Z',
      },
    ],
  });
  mockUseMyPatients.mockReturnValue({
    data: [
      {
        paciente: detail,
        proxima_cita: { inicio: '2026-09-02T14:00:00Z' },
        ultima_consulta: { fecha_consulta: '2026-08-20T10:00:00Z' },
      },
    ],
  });
  mockUseNextPatientAppointment.mockReturnValue({
    data: { id: 4, inicio: '2026-09-02T14:00:00Z' },
    isLoading: false,
  });
  mockUsePatientMeasurements.mockReturnValue({
    data: [
      {
        id: 'm1',
        paciente_id: 9,
        indicador_id: 'i1',
        valor: 70,
        unidad_medida_id: 1,
        origen_registro_id: 2,
        registrado_por_id: 99,
        fecha_medicion: '2026-08-29T12:00:00Z',
        observaciones: null,
      },
    ],
  });
  mockUseMeasurementCatalogs.mockReturnValue({
    indicators: { data: [{ id: 'i1', nombre: 'Frecuencia cardiaca' }] },
    units: { data: { items: [{ id: 1, nombre: 'bpm' }] } },
    origins: { data: { items: [{ id: 2, nombre: 'Paciente' }] } },
  });
  mockUsePatientFamily.mockReturnValue({
    data: [
      {
        id: 3,
        usuario_relacionado_id: 40,
        nombres: 'Jane',
        apellidos: 'Doe',
        tipo_relacion_id: 1,
        tipo_relacion: 'Cónyuge',
        recibir_notificaciones: true,
        estado: 'active',
        nivel_acceso: 'read',
        expira_en: null,
      },
    ],
    isLoading: false,
    isError: false,
  });
}

describe('patient detail and family screens J15', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaults();
  });

  it('shows appointment, last consultation, vital signs and patient measurements', async () => {
    const screen = await render(<PatientDetailScreen patientId={9} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Próxima cita')).toBeTruthy();
    expect(screen.getByText('Última consulta')).toBeTruthy();
    expect(screen.getByText('Presión arterial')).toBeTruthy();
    expect(screen.getByText('Glucosa')).toBeTruthy();
    expect(screen.getByText('SpO₂')).toBeTruthy();
    expect(screen.getByText('Frecuencia cardiaca')).toBeTruthy();
    expect(screen.getByText(/70 bpm.*Paciente/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Ver historial de mediciones'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/measurements');

    await fireEvent.press(screen.getByText('Expediente Médico'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record');

    await fireEvent.press(screen.getByText('Documento clínico y PDF'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/document');
  });

  it('opens the appointment detail when pressing the pending appointment', async () => {
    const screen = await render(<PatientDetailScreen patientId={9} />);
    await fireEvent.press(screen.getByLabelText('Ver próxima cita'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/appointments/4');
  });

  it('keeps Bruno-style follow-up self-scoped: no next appointment but a last consultation', async () => {
    mockUseMyPatients.mockReturnValue({
      data: [
        {
          paciente: detail,
          proxima_cita: null,
          ultima_consulta: { fecha_consulta: '2026-08-20T10:00:00Z' },
        },
      ],
    });
    mockUseNextPatientAppointment.mockReturnValue({ data: null, isLoading: false });

    const screen = await render(<PatientDetailScreen patientId={9} />);
    expect(screen.getAllByText('No disponible')).toHaveLength(1);
    expect(mockUseMyPatients).toHaveBeenCalledTimes(1);
    expect(mockUseMedicalRecordSummary).toHaveBeenCalledTimes(1);
  });

  it('renders family access as read-only backend state', async () => {
    const screen = await render(<PatientFamilyScreen patientId={9} />);
    expect(screen.getByText('Familiares y Acceso')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Lectura')).toBeTruthy();
  });

  it('blocks direct access without clinica:manage', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const detailScreen = await render(<PatientDetailScreen patientId={9} />);
    expect(detailScreen.getByText('Acceso restringido')).toBeTruthy();
    await detailScreen.unmount();
    const familyScreen = await render(<PatientFamilyScreen patientId={9} />);
    expect(familyScreen.getByText('Acceso restringido')).toBeTruthy();
  });
});
