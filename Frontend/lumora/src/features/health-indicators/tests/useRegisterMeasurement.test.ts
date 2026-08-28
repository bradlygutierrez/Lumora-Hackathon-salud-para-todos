jest.mock('@/features/health-indicators/api/health-indicators-api', () => ({
  healthIndicatorsApi: {
    registerMeasurement: jest.fn(),
  },
}));

jest.mock('@/features/prescriptions/hooks/useCatalog', () => ({
  useRecordOriginCatalog: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import { useRegisterMeasurement } from '@/features/health-indicators/hooks/useRegisterMeasurement';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useRecordOriginCatalog } from '@/features/prescriptions/hooks/useCatalog';

describe('useRegisterMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useRecordOriginCatalog as jest.Mock).mockReturnValue({
      idByName: (nombre: string) => {
        if (nombre === 'Manual') return 1;
        if (nombre === 'Dispositivo') return 2;
        return undefined;
      },
    });
  });

  /**
   * `usePatientId` (patientContext) resuelve de forma asíncrona; se
   * precarga el cache de React Query con GET /pacientes/me ya resuelto
   * -- mismo escenario real cuando el usuario ya visitó "Medicación" antes
   * (ambos comparten la queryKey 'patient-me') -- para probar la mutación
   * sin depender de temporizadores.
   */
  function clientWithPatientCached() {
    const client = createTestQueryClient();
    client.setQueryData(['patient-me'], {
      id: 7,
      tipo_sangre_id: null,
      alergias: null,
      persona: { id: 1, nombres: 'Ana', apellidos: 'Zepeda' },
    });
    return client;
  }

  it('registers a measurement, resolving "Manual" to its origen_registro_id and trimming empty observaciones to null', async () => {
    (healthIndicatorsApi.registerMeasurement as jest.Mock).mockResolvedValue({
      id: 'medicion-1',
    });

    const client = clientWithPatientCached();
    const { result } = await renderHook(() => useRegisterMeasurement(), {
      wrapper: createQueryWrapper(client),
    });

    result.current.mutate({
      indicadorId: 'ind-1',
      valor: 120,
      unidadMedidaId: 1,
      origen: 'Manual',
      observaciones: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(healthIndicatorsApi.registerMeasurement).toHaveBeenCalledWith(7, {
      indicador_id: 'ind-1',
      valor: 120,
      unidad_medida_id: 1,
      origen_registro_id: 1,
      observaciones: null,
    });
  });

  it('fails without calling the API when the origen catalog has not resolved', async () => {
    (useRecordOriginCatalog as jest.Mock).mockReturnValue({
      idByName: () => undefined,
    });

    const client = clientWithPatientCached();
    const { result } = await renderHook(() => useRegisterMeasurement(), {
      wrapper: createQueryWrapper(client),
    });

    result.current.mutate({
      indicadorId: 'ind-1',
      valor: 120,
      unidadMedidaId: 1,
      origen: 'Manual',
      observaciones: null,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(healthIndicatorsApi.registerMeasurement).not.toHaveBeenCalled();
  });
});
