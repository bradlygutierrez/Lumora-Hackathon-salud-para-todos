jest.mock('@/features/prescriptions/api/prescriptions-api', () => ({
  prescriptionsApi: {
    getPrescriptionStatuses: jest.fn(),
    getMedications: jest.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';
import {
  useMedicationsCatalog,
  usePrescriptionStatusCatalog,
} from '@/features/prescriptions/hooks/useCatalog';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/prescriptions/tests/query-test-utils';

describe('usePrescriptionStatusCatalog', () => {
  it('resolves ids <-> nombres from the /estados-receta page', async () => {
    (prescriptionsApi.getPrescriptionStatuses as jest.Mock).mockResolvedValue({
      items: [
        { id: 1, nombre: 'Activa' },
        { id: 2, nombre: 'Completada' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => usePrescriptionStatusCatalog(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.idByName('Activa')).toBe(1);
    expect(result.current.nameById(2)).toBe('Completada');
    expect(result.current.nameById(999)).toBe('Desconocido');
  });
});

describe('useMedicationsCatalog', () => {
  it('resolves medicamento_id (string) to nombre', async () => {
    (prescriptionsApi.getMedications as jest.Mock).mockResolvedValue([
      { id: 'med-1', nombre: 'Losartán', activo: true, created_at: '2026-01-01T00:00:00Z' },
    ]);

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicationsCatalog(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nameById('med-1')).toBe('Losartán');
    expect(result.current.nameById('unknown')).toBe('Medicamento');
  });
});
