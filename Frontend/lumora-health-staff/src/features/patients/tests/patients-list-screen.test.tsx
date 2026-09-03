import { fireEvent, render } from '@testing-library/react-native';

import { PatientListScreen } from '../screens/PatientListScreen';

const mockUsePatients = jest.fn();
const mockUseMyPatients = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockPush = jest.fn();
const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-my-patients', () => ({
  useMyPatients: () => mockUseMyPatients(),
}));
jest.mock('../hooks/use-patients', () => ({
  usePatients: (params: unknown) => mockUsePatients(params),
  usePatientCatalogs: () => mockUsePatientCatalogs(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/AppTopBar', () => ({ AppTopBar: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const patient = {
  id: 7,
  tipo_sangre_id: 1,
  alergias: null,
  persona: {
    id: 10,
    nombres: 'Ana',
    apellidos: 'Mora',
    fecha_nacimiento: '1990-04-10',
    telefono: '8888-1111',
    email: 'ana@example.com',
    sexo_id: 2,
    direcciones: [],
  },
};

function catalogs() {
  return {
    sexes: {
      data: { items: [{ id: 2, nombre: 'Femenino' }], total: 1, limit: 100, offset: 0 },
      isLoading: false,
      isError: false,
    },
    bloodTypes: {
      data: { items: [{ id: 1, nombre: 'O+' }], total: 1, limit: 100, offset: 0 },
      isLoading: false,
      isError: false,
    },
  };
}

describe('PatientListScreen J15', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUsePatientCatalogs.mockReturnValue(catalogs());
    mockUsePatients.mockReturnValue({
      data: { items: [patient], total: 11, limit: 10, offset: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseMyPatients.mockReturnValue({
      data: [
        {
          paciente: patient,
          proxima_cita: {
            id: 3,
            paciente_id: 7,
            paciente_nombre: 'Ana Mora',
            inicio: '2026-09-01T14:00:00Z',
            fin: '2026-09-01T14:45:00Z',
            notas: null,
            estado: null,
            tipo_cita: null,
            ubicacion: null,
          },
          ultima_consulta: {
            id: 4,
            expediente_id: 8,
            paciente_id: 7,
            profesional_id: 2,
            motivo_consulta_id: null,
            fecha_consulta: '2026-08-20T14:00:00Z',
            motivo: null,
            sintomas: null,
            evaluacion: null,
            indicaciones: null,
            observaciones: null,
            activo: true,
          },
        },
      ],
      isLoading: false,
      isError: false,
    });
  });

  it('shows real my-patients context by default', async () => {
    const screen = await render(<PatientListScreen />);
    expect(screen.getByText('Mis pacientes')).toBeTruthy();
    expect(screen.getByText('Ana Mora')).toBeTruthy();
    expect(screen.getByText('Próxima cita')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ver ficha'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/7');
  });

  it('preserves authorized search, filters and pagination', async () => {
    const screen = await render(<PatientListScreen />);
    await fireEvent.press(screen.getByText('Buscar pacientes'));

    await fireEvent.changeText(screen.getByLabelText('Buscar pacientes'), 'Ana');
    expect(mockUsePatients).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Ana', offset: 0 }),
    );

    await fireEvent.press(screen.getByText('Femenino'));
    expect(mockUsePatients).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Ana', sexo_id: 2, offset: 0 }),
    );

    await fireEvent.press(screen.getByText('Siguiente'));
    expect(mockUsePatients).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 10 }),
    );

    await fireEvent.press(screen.getByLabelText('Registrar paciente'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/new');
  });

  it('blocks direct access without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<PatientListScreen />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });
});
