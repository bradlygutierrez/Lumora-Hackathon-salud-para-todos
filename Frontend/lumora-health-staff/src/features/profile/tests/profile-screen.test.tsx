import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import StaffProfileScreen from '@/app/(staff)/profile';

// StaffProfileScreen usa useQueryClient() para su pull-to-refresh -- necesita
// un QueryClientProvider aunque estos tests no ejerciten esa acción.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StaffProfileScreen />
    </QueryClientProvider>,
  );
}

const mockReloadUser = jest.fn();
const mockSignOut = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseAccountProfile = jest.fn();
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

jest.mock('@/src/features/profile/hooks/use-account', () => ({
  useAccountProfile: () => mockUseAccountProfile(),
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
    mockUseAccountProfile.mockReturnValue({
      data: {
        id: 7,
        username: 'doctor',
        email: 'doctor@example.com',
        email_verified: true,
        profile_image_url: null,
        person: {
          id: 9,
          first_names: 'Ana',
          last_names: 'Mora',
          birth_date: null,
          phone: '8888-4444',
          email: 'doctor@example.com',
          sex_id: null,
          addresses: [],
        },
        roles: [],
      },
      isLoading: false,
      isError: false,
    });
  });

  it('renders profile and MFA status only from backend data', async () => {
    const screen = await renderScreen();

    expect(screen.getByText('Ana Mora')).toBeTruthy();
    expect(screen.getByText('8888-4444')).toBeTruthy();
    expect(screen.getByText('Cardiología')).toBeTruthy();
    expect(screen.getByText('MED-012')).toBeTruthy();
    expect(screen.getByText('MFA Inactivo')).toBeTruthy();
    expect(screen.queryByText('MFA Activo')).toBeNull();
    expect(screen.queryByText('Ajustes de la App')).toBeNull();
  });

  it('links to the edit-profile screen', async () => {
    const screen = await renderScreen();

    expect(screen.getByText('Editar Perfil')).toBeTruthy();
  });
});
