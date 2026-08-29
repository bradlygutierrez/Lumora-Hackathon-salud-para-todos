import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import {
  useClinicalNotes,
  useConsultation,
  useConsultationReasons,
  useConsultations,
  useRecordConsultations,
  useVitalSigns,
} from '../hooks/use-consultations';
import * as consultationsApi from '../api/consultations.api';

const mockUseAuthSession = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../api/consultations.api', () => ({
  getConsultation: jest.fn(),
  listClinicalNotes: jest.fn(),
  listConsultationReasons: jest.fn(),
  listConsultations: jest.fn(),
  listRecordConsultations: jest.fn(),
  listVitalSigns: jest.fn(),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('consultations preview hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ session: { isPreview: true } });
  });

  it('serves consultation clinical data without calling FastAPI', async () => {
    const filtered = await renderHook(
      () => useConsultations({ expediente_id: 7001, profesional_id: 101, activo: true }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(filtered.result.current.isSuccess).toBe(true));
    expect(filtered.result.current.data?.items).toHaveLength(1);

    const consultations = await renderHook(
      () => useRecordConsultations(7001, { limit: 20, offset: 0, activo: true }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(consultations.result.current.isSuccess).toBe(true));
    expect(consultations.result.current.data?.items[0]?.id).toBe(5001);

    const detail = await renderHook(() => useConsultation(5001), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(detail.result.current.data?.profesional_id).toBe(101);

    const vitalSigns = await renderHook(() => useVitalSigns(5001), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(vitalSigns.result.current.isSuccess).toBe(true));
    expect(vitalSigns.result.current.data?.items[0]?.saturacion_oxigeno).toBe(98);

    const notes = await renderHook(() => useClinicalNotes(5001, { activo: true }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(notes.result.current.isSuccess).toBe(true));
    expect(notes.result.current.data?.items[0]?.autor_id).toBe(9001);

    const reasons = await renderHook(() => useConsultationReasons(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(reasons.result.current.isSuccess).toBe(true));
    expect(reasons.result.current.data?.items).toHaveLength(2);

    expect(consultationsApi.listConsultations).not.toHaveBeenCalled();
    expect(consultationsApi.listRecordConsultations).not.toHaveBeenCalled();
    expect(consultationsApi.getConsultation).not.toHaveBeenCalled();
    expect(consultationsApi.listVitalSigns).not.toHaveBeenCalled();
    expect(consultationsApi.listClinicalNotes).not.toHaveBeenCalled();
    expect(consultationsApi.listConsultationReasons).not.toHaveBeenCalled();

    await filtered.unmount();
    await consultations.unmount();
    await detail.unmount();
    await vitalSigns.unmount();
    await notes.unmount();
    await reasons.unmount();
  });
});
