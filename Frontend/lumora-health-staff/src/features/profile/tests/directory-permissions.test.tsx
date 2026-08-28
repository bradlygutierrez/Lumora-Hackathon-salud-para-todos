import { render } from '@testing-library/react-native';

import MedicalDirectoryScreen from '@/app/(staff)/directory';
import StaffDetailScreen from '@/app/(staff)/staff/[id]';

const mockUseAuthSession = jest.fn();
const mockUseProfessionals = jest.fn();
const mockUseProfessional = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@/src/features/profile/hooks/use-professionals', () => ({
  useProfessionals: () => mockUseProfessionals(),
  useProfessional: () => mockUseProfessional(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useLocalSearchParams: () => ({ id: '7' }),
  };
});

describe('professional directory permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfessionals.mockReturnValue({
      data: { items: [], total: 0, limit: 20, offset: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseProfessional.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('does not treat rbac:manage alone as clinical directory access', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['rbac:manage']) });

    const directory = await render(<MedicalDirectoryScreen />);
    expect(directory.getByText('Acceso restringido')).toBeTruthy();
    await directory.unmount();

    const detail = await render(<StaffDetailScreen />);
    expect(detail.getByText('Acceso restringido')).toBeTruthy();
  });

  it('allows clinica:manage to access directory and staff profile', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });

    const directory = await render(<MedicalDirectoryScreen />);
    expect(directory.getByText('Directorio de Personal Médico')).toBeTruthy();
    await directory.unmount();

    const detail = await render(<StaffDetailScreen />);
    expect(detail.queryByText('Acceso restringido')).toBeNull();
  });

  it('renders only professional fields backed by the FastAPI contract', async () => {
    const professional = {
      id: 7,
      especialidad: 'Cardiología',
      numero_licencia: 'MED-007',
      persona: {
        id: 9,
        nombres: 'Ana',
        apellidos: 'Mora',
        fecha_nacimiento: null,
        telefono: '8888-8888',
        sexo_id: null,
        direcciones: [],
      },
    };
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseProfessionals.mockReturnValue({
      data: { items: [professional], total: 1, limit: 20, offset: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseProfessional.mockReturnValue({
      data: professional,
      isLoading: false,
      isError: false,
    });

    const directory = await render(<MedicalDirectoryScreen />);

    expect(directory.getByText(/MED-007/)).toBeTruthy();
    expect(directory.queryByText('Médico de Cabecera')).toBeNull();
    expect(directory.queryByText('Activo')).toBeNull();
    await directory.unmount();

    const detail = await render(<StaffDetailScreen />);
    expect(detail.queryByText('Cuenta Activa')).toBeNull();
    expect(detail.queryByText('Especialidades y Certificaciones')).toBeNull();
    expect(detail.queryByText('Resumen de Pacientes Asignados')).toBeNull();
  });

});
