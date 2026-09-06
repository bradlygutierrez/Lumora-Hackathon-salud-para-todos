jest.mock('@/features/prescriptions/api/schedules-api', () => ({
  schedulesApi: {
    registerDose: jest.fn(),
  },
}));

jest.mock('@/features/prescriptions/hooks/useCatalog', () => ({
  useDoseStatusCatalog: jest.fn(),
  useRecordOriginCatalog: jest.fn(),
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import {
  useDoseStatusCatalog,
  useRecordOriginCatalog,
} from '@/features/prescriptions/hooks/useCatalog';
import { useRegisterDose } from '@/features/prescriptions/hooks/useRegisterDose';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/prescriptions/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

describe('useRegisterDose', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDoseStatusCatalog as jest.Mock).mockReturnValue({
      idByName: (nombre: string) => (nombre === 'Tomada' ? 1 : undefined),
    });
    (useRecordOriginCatalog as jest.Mock).mockReturnValue({
      idByName: (nombre: string) => (nombre === 'Manual' ? 2 : undefined),
    });
    (useShellContext as jest.Mock).mockReturnValue({
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
    });

    (schedulesApi.registerDose as jest.Mock).mockResolvedValue({ id: 'dosis-1' });
  });

  it(
    "invalidates the active patient's real medication query prefix on success " +
      '(not the unscoped "dosis-logs" key useTodayMedicationPlan never uses)',
    async () => {
      const client = createTestQueryClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const { result } = await renderHook(() => useRegisterDose(), {
        wrapper: createQueryWrapper(client),
      });

      result.current.mutate({ horarioId: 'horario-1', hora: '08:00:00' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['patient', 7, 'medication'],
      });
    },
  );
});
