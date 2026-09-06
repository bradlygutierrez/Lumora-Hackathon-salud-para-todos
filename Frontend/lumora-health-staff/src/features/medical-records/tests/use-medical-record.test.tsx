import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { getMedicalRecordSummary, getMedicalRecordTimeline } from '../api/medical-records.api';
import { useMedicalRecordSummary, useMedicalRecordTimeline } from '../hooks/use-medical-record';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../api/medical-records.api', () => ({
  getMedicalRecordSummary: jest.fn(),
  getMedicalRecordTimeline: jest.fn(),
}));

const mockGetSummary = getMedicalRecordSummary as jest.Mock;
const mockGetTimeline = getMedicalRecordTimeline as jest.Mock;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('medical record hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses local clinical data when the authenticated session is preview', async () => {
    mockUseAuthSession.mockReturnValue({ session: { isPreview: true } });

    const { result, unmount } = await renderHook(() => useMedicalRecordSummary(101), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.paciente.nombres).toBe('Ana');
    expect(result.current.data?.expediente?.numero_expediente).toBe('LM-2026-0101');
    expect(mockGetSummary).not.toHaveBeenCalled();
    await unmount();
  });

  it('uses FastAPI for a real clinical session', async () => {
    mockUseAuthSession.mockReturnValue({ session: { isPreview: false } });
    mockGetSummary.mockResolvedValueOnce({
      paciente_id: 9,
      paciente: { id: 81, nombres: 'Real', apellidos: 'Paciente', fecha_nacimiento: null, sexo_id: null },
      expediente: null,
      antecedentes: [],
      alergias: [],
      discapacidades: [],
      condiciones: [],
      consultas: [],
      recetas: [],
      mediciones: [],
      alertas: [],
    });

    const { result, unmount } = await renderHook(() => useMedicalRecordSummary(9), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSummary).toHaveBeenCalledWith(9);
    await unmount();
  });

  it('filters and paginates preview timeline without FastAPI', async () => {
    mockUseAuthSession.mockReturnValue({ session: { isPreview: true } });

    const { result, unmount } = await renderHook(
      () => useMedicalRecordTimeline(7001, { tipo: 'diagnostico', limit: 1 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(result.current.data?.pages[0].items[0].tipo).toBe('diagnostico');
    expect(mockGetTimeline).not.toHaveBeenCalled();
    await unmount();
  });
});
