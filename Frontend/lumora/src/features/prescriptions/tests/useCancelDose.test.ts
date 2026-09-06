jest.mock('@/features/prescriptions/api/schedules-api', () => ({
  schedulesApi: {
    updateDosisLog: jest.fn(),
  },
}));

jest.mock('@/features/prescriptions/hooks/useCatalog', () => ({
  useDoseStatusCatalog: jest.fn(),
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import { useCancelDose } from '@/features/prescriptions/hooks/useCancelDose';
import { useDoseStatusCatalog } from '@/features/prescriptions/hooks/useCatalog';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/prescriptions/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

describe('useCancelDose', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDoseStatusCatalog as jest.Mock).mockReturnValue({
      idByName: (nombre: string) => (nombre === 'Pendiente' ? 3 : undefined),
    });
    (useShellContext as jest.Mock).mockReturnValue({
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
    });

    (schedulesApi.updateDosisLog as jest.Mock).mockResolvedValue({ id: 'dosis-1' });
  });

  it("invalidates the active patient's real medication query prefix on success", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(() => useCancelDose(), {
      wrapper: createQueryWrapper(client),
    });

    result.current.mutate({ dosisId: 'dosis-1', horarioId: 'horario-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['patient', 7, 'medication'],
    });
  });
});
