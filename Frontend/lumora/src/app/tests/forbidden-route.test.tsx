import { act, fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const mockReplace = jest.fn();
const mockClearSession = jest.fn();

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));
jest.mock('@/features/auth/store/auth-store', () => ({
  useAuthStore: (selector: (state: { clearSession: typeof mockClearSession }) => unknown) =>
    selector({ clearSession: mockClearSession }),
}));

import ForbiddenRoute from '@/app/forbidden';

describe('ForbiddenRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClearSession.mockResolvedValue(undefined);
  });

  it('logs out and returns to login instead of re-entering the app', async () => {
    // Regresión: "Volver al inicio" hacía router.replace('/'), que para
    // una sesión autenticada con rol "unsupported" rebotaba de vuelta a
    // esta misma pantalla (index -> (app)/(tabs) -> forbidden -> ...),
    // dando la sensación de que el botón no hacía nada.
    const screen = await renderWithClient(<ForbiddenRoute />);

    await act(() => fireEvent.press(screen.getByText('Cerrar sesión')));

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
