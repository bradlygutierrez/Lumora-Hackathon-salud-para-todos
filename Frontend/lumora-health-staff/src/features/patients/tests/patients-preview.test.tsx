import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import {
  usePatient,
  usePatientCatalogs,
  usePatientClinicalSummary,
  usePatientFamily,
  usePatients,
} from '../hooks/use-patients';

const mockListPatients = jest.fn();
const mockGetPatient = jest.fn();
const mockGetPatientFamily = jest.fn();
const mockGetPatientClinicalSummary = jest.fn();
const mockListSexes = jest.fn();
const mockListBloodTypes = jest.fn();

jest.mock('@/src/application/config/env', () => ({
  env: { enableUiPreview: false },
}));

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({ session: { isPreview: true } }),
}));

jest.mock('../api/patients.api', () => ({
  listPatients: (...args: unknown[]) => mockListPatients(...args),
  getPatient: (...args: unknown[]) => mockGetPatient(...args),
  getPatientFamily: (...args: unknown[]) => mockGetPatientFamily(...args),
  getPatientClinicalSummary: (...args: unknown[]) => mockGetPatientClinicalSummary(...args),
  listSexes: (...args: unknown[]) => mockListSexes(...args),
  listBloodTypes: (...args: unknown[]) => mockListBloodTypes(...args),
  registerClinicalPatient: jest.fn(),
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('J09 UI preview data', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders patient preview queries without calling FastAPI', async () => {
    mockListPatients.mockRejectedValue(new Error('FastAPI must not be called in preview'));
    mockGetPatient.mockRejectedValue(new Error('FastAPI must not be called in preview'));
    mockGetPatientFamily.mockRejectedValue(new Error('FastAPI must not be called in preview'));
    mockGetPatientClinicalSummary.mockRejectedValue(new Error('FastAPI must not be called in preview'));
    mockListSexes.mockRejectedValue(new Error('FastAPI must not be called in preview'));
    mockListBloodTypes.mockRejectedValue(new Error('FastAPI must not be called in preview'));

    const patients = await renderHook(() => usePatients({ limit: 10, offset: 0 }), { wrapper: createWrapper() });
    await waitFor(() => expect(patients.result.current.isSuccess).toBe(true));
    expect(patients.result.current.data?.items[0]?.persona.nombres).toBe('Ana');
    await patients.unmount();

    const detail = await renderHook(() => usePatient(101), { wrapper: createWrapper() });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(detail.result.current.data?.id).toBe(101);
    await detail.unmount();

    const family = await renderHook(() => usePatientFamily(101), { wrapper: createWrapper() });
    await waitFor(() => expect(family.result.current.isSuccess).toBe(true));
    expect(family.result.current.data?.[0]?.tipo_relacion).toBe('Hija');
    await family.unmount();

    const summary = await renderHook(() => usePatientClinicalSummary(101), { wrapper: createWrapper() });
    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    expect(summary.result.current.data?.expediente?.numero_expediente).toBe('LM-2026-0101');
    await summary.unmount();

    const catalogs = await renderHook(() => usePatientCatalogs(), { wrapper: createWrapper() });
    await waitFor(() => expect(catalogs.result.current.sexes.isSuccess).toBe(true));
    await waitFor(() => expect(catalogs.result.current.bloodTypes.isSuccess).toBe(true));
    await catalogs.unmount();

    expect(mockListPatients).not.toHaveBeenCalled();
    expect(mockGetPatient).not.toHaveBeenCalled();
    expect(mockGetPatientFamily).not.toHaveBeenCalled();
    expect(mockGetPatientClinicalSummary).not.toHaveBeenCalled();
    expect(mockListSexes).not.toHaveBeenCalled();
    expect(mockListBloodTypes).not.toHaveBeenCalled();
  });
});
