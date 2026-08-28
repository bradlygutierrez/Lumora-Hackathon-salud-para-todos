import { fireEvent, render } from '@testing-library/react-native';

import { PatientDetailScreen } from '../screens/PatientDetailScreen';
import { PatientFamilyScreen } from '../screens/PatientFamilyScreen';

const mockUsePatient = jest.fn();
const mockUsePatientFamily = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUsePatientClinicalSummary = jest.fn();
const mockUseAuthSession = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
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
    direcciones: [
      {
        id: 1,
        linea_1: '123 Healthway Dr.',
        ciudad: 'Managua',
        departamento: 'Managua',
        pais: 'Nicaragua',
        codigo_postal: null,
        es_principal: true,
      },
    ],
  },
  contactos_emergencia: [
    { id: 5, paciente_id: 9, nombre: 'Jane Doe', parentesco: 'Cónyuge', telefono: '555-9876', email: null },
  ],
};

function defaults() {
  mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
  mockUsePatient.mockReturnValue({ data: detail, isLoading: false, isError: false, error: null });
  mockUsePatientCatalogs.mockReturnValue({
    sexes: { data: { items: [{ id: 1, nombre: 'Masculino' }] }, isLoading: false, isError: false },
    bloodTypes: { data: { items: [{ id: 3, nombre: 'O+' }] }, isLoading: false, isError: false },
  });
  mockUsePatientClinicalSummary.mockReturnValue({
    data: { paciente_id: 9, expediente: { id: 17, paciente_id: 9, estado_expediente_id: 1, numero_expediente: 'EXP-17', notas: null, activo: true } },
    isLoading: false,
    isError: false,
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
    error: null,
  });
}

describe('patient detail and family screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaults();
  });

  it('renders only supported demographic/contact data and navigates to real patient resources', async () => {
    const screen = await render(<PatientDetailScreen patientId={9} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Penicilina')).toBeTruthy();
    expect(screen.queryByText(/Lisinopril/i)).toBeNull();
    expect(screen.queryByText(/MRN/i)).toBeNull();

    await fireEvent.press(screen.getByText('Familiares y acceso'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/family');

    await fireEvent.press(screen.getByText('Expediente Médico'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record');
  });

  it('renders family access as read-only backend state', async () => {
    const screen = await render(<PatientFamilyScreen patientId={9} />);

    expect(screen.getByText('Familiares y Acceso')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Cónyuge')).toBeTruthy();
    expect(screen.getByText('Lectura')).toBeTruthy();
    expect(screen.getByText('Activo')).toBeTruthy();
    expect(screen.queryByText('Añadir Familiar')).toBeNull();
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
