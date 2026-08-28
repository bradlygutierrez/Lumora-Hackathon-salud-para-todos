import { fireEvent, render } from '@testing-library/react-native';

import { PatientListScreen } from '../screens/PatientListScreen';

const mockUsePatients = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockPush = jest.fn();
const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
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

describe('PatientListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUsePatientCatalogs.mockReturnValue(catalogs());
    mockUsePatients.mockReturnValue({
      data: { items: [patient], total: 11, limit: 10, offset: 0 },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('blocks direct access without the clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<PatientListScreen />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('renders backend patients and updates search/filter/pagination queries', async () => {
    const screen = await render(<PatientListScreen />);

    expect(screen.getByText('Lista de Pacientes')).toBeTruthy();
    expect(screen.getByText('Ana Mora')).toBeTruthy();
    expect(screen.queryByText(/MRN/i)).toBeNull();

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

    await fireEvent.press(screen.getByText('Ver ficha'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/7');

    await fireEvent.press(screen.getByLabelText('Registrar paciente'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/new');
  });

  it('renders loading, empty and error states instead of fake rows', async () => {
    mockUsePatients.mockReturnValueOnce({ data: undefined, isLoading: true, isError: false, error: null });
    const loading = await render(<PatientListScreen />);
    expect(loading.getByText('Cargando pacientes')).toBeTruthy();
    await loading.unmount();

    mockUsePatients.mockReturnValueOnce({
      data: { items: [], total: 0, limit: 10, offset: 0 },
      isLoading: false,
      isError: false,
      error: null,
    });
    const empty = await render(<PatientListScreen />);
    expect(empty.getByText('No se encontraron pacientes')).toBeTruthy();
    await empty.unmount();

    mockUsePatients.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, error: new Error('boom') });
    const error = await render(<PatientListScreen />);
    expect(error.getByText('No se pudo cargar la lista')).toBeTruthy();
  });
});
