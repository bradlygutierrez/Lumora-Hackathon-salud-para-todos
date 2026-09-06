jest.mock('@/features/health-indicators/api/health-indicators-api', () => ({
  healthIndicatorsApi: {
    registerMeasurement: jest.fn(),
  },
}));

jest.mock('@/features/prescriptions/hooks/useCatalog', () => ({
  useRecordOriginCatalog: jest.fn(),
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import {
  registerMeasurementErrorMessage,
  useRegisterMeasurement,
} from '@/features/health-indicators/hooks/useRegisterMeasurement';
import { ApiError } from '@/shared/api/api-error';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useRecordOriginCatalog } from '@/features/prescriptions/hooks/useCatalog';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

describe('useRegisterMeasurement', () => {
  it('explains when a caregiver lacks write permission', () => {
    expect(
      registerMeasurementErrorMessage(
        new ApiError('FORBIDDEN', 403, 'Forbidden'),
      ),
    ).toBe('No tienes permiso para registrar mediciones de este paciente.');
  });
  beforeEach(() => {
    jest.clearAllMocks();

    (useRecordOriginCatalog as jest.Mock).mockReturnValue({
      idByName: (nombre: string) => {
        if (nombre === 'Manual') return 1;
        if (nombre === 'Dispositivo') return 2;
        return undefined;
      },
    });

    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [],
      switchPatient: jest.fn(),
    });
  });

  it('registers a measurement, resolving "Manual" to its origen_registro_id and trimming empty observaciones to null', async () => {
    (healthIndicatorsApi.registerMeasurement as jest.Mock).mockResolvedValue({
      id: 'medicion-1',
    });

    const client = createTestQueryClient();
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

    const client = createTestQueryClient();
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

  it('fails without calling the API when there is no active patientContext (ej. Cuidador sin paciente seleccionado)', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'needs-patient',
      role: 'caregiver',
      activePatient: null,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
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
