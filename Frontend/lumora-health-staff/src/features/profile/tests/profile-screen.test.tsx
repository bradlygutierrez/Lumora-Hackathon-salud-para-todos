import { render } from '@testing-library/react-native';

import StaffProfileScreen from '@/app/(staff)/profile';

const mockReloadUser = jest.fn();
const mockSignOut = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseMfaMethods = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({
    reloadUser: mockReloadUser,
    signOut: mockSignOut,
    session: {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'bearer',
      userId: 7,
      user: {
        id: 7,
        email: 'doctor@example.com',
        username: 'doctor',
        activo: true,
        email_verificado: true,
        persona: { id: 9, nombres: 'Ana', apellidos: 'Mora', telefono: '8888-4444' },
        roles: [
          {
            id: 3,
            nombre: 'Profesional',
            permisos: [{ id: 5, nombre: 'clinica:manage' }],
          },
        ],
      },
    },
  }),
}));

jest.mock('@/src/features/profile/hooks/use-professionals', () => ({
  useCurrentProfessional: () => mockUseCurrentProfessional(),
}));

jest.mock('@/src/features/auth/hooks/use-security', () => ({
  useMfaMethods: () => mockUseMfaMethods(),
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

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('StaffProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfessional.mockReturnValue({
      data: {
        id: 12,
        especialidad: 'Cardiología',
        numero_licencia: 'MED-012',
        persona: {
          id: 9,
          nombres: 'Ana',
          apellidos: 'Mora',
          fecha_nacimiento: null,
          telefono: null,
          sexo_id: null,
          direcciones: [],
        },
      },
      isLoading: false,
      isError: false,
    });
    mockUseMfaMethods.mockReturnValue({
      data: [{ id: 2, metodo_id: 1, nombre: 'TOTP', activo: false }],
      isLoading: false,
      isError: false,
    });
  });

  it('renders profile and MFA status only from backend data', async () => {
    const screen = await render(<StaffProfileScreen />);

    expect(screen.getByText('Ana Mora')).toBeTruthy();
    expect(screen.getByText('8888-4444')).toBeTruthy();
    expect(screen.getByText('Cardiología')).toBeTruthy();
    expect(screen.getByText('MED-012')).toBeTruthy();
    expect(screen.getByText('MFA Inactivo')).toBeTruthy();
    expect(screen.queryByText('MFA Activo')).toBeNull();
    expect(screen.queryByText('Editar Perfil')).toBeNull();
    expect(screen.queryByText('Ajustes de la App')).toBeNull();
  });
});
