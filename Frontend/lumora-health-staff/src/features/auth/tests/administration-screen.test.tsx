import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import AdministrationScreen from '@/app/(staff)/administration';
import { listUsers } from '@/src/features/auth/api/users.api';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('@/src/features/auth/api/users.api', () => ({
  listUsers: jest.fn(),
  createAdminUser: jest.fn(),
  resendPasswordReset: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockListUsers = listUsers as jest.Mock;

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AdministrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch users and shows a restricted-access state without rbac:manage', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });

    const screen = await render(<AdministrationScreen />, { wrapper });

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('fetches and shows users for staff with rbac:manage', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['rbac:manage']) });
    mockListUsers.mockResolvedValueOnce({
      items: [{ id: 1, email: 'admin@lumora.med', persona: { nombres: 'Ana', apellidos: 'Ríos' } }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    const screen = await render(<AdministrationScreen />, { wrapper });

    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    expect(await screen.findByText('admin@lumora.med')).toBeTruthy();
  });
});
