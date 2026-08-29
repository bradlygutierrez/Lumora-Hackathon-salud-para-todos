import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { findProfessionalByPersonId } from '../api/professionals.api';
import { useCurrentProfessional } from '../hooks/use-professionals';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../api/professionals.api', () => ({
  getProfessional: jest.fn(),
  listProfessionals: jest.fn(),
  findProfessionalByPersonId: jest.fn(),
}));

const mockFindProfessionalByPersonId = findProfessionalByPersonId as jest.Mock;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('current professional hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the preview professional from the authenticated person', async () => {
    mockUseAuthSession.mockReturnValue({
      session: { isPreview: true, user: { persona: { id: 8001 } } },
    });

    const { result, unmount } = await renderHook(() => useCurrentProfessional(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(101);
    expect(mockFindProfessionalByPersonId).not.toHaveBeenCalled();
    await unmount();
  });

  it('resolves the backend professional using the authenticated person id', async () => {
    mockUseAuthSession.mockReturnValue({
      session: { isPreview: false, user: { persona: { id: 77 } } },
    });
    mockFindProfessionalByPersonId.mockResolvedValueOnce({ id: 8, persona: { id: 77 } });

    const { result, unmount } = await renderHook(() => useCurrentProfessional(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFindProfessionalByPersonId).toHaveBeenCalledWith(77);
    expect(result.current.data?.id).toBe(8);
    await unmount();
  });
});
