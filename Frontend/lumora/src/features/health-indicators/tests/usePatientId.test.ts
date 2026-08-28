jest.mock('@/features/prescriptions/api/prescriptions-api', () => ({
  prescriptionsApi: {
    getMyPatientProfile: jest.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { usePatientId } from '@/features/health-indicators/hooks/usePatientId';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';

/**
 * `usePatientId` es hoy el "patientContext" de A08: resuelve el
 * paciente_id del usuario logueado (reutilizando GET /pacientes/me, ya
 * probado en A07) para que Seleccionar Indicador, Historial y Nueva
 * Medición sepan de qué paciente traer/guardar datos. B09 agregará el
 * patientContext completo (cuidador eligiendo ENTRE varios pacientes).
 */
describe('usePatientId (patientContext)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the paciente_id of the logged in user from /pacientes/me', async () => {
    (prescriptionsApi.getMyPatientProfile as jest.Mock).mockResolvedValue({
      id: 7,
      tipo_sangre_id: null,
      alergias: null,
      persona: { id: 1, nombres: 'Ana', apellidos: 'Zepeda' },
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => usePatientId(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pacienteId).toBe(7);
    expect(result.current.isError).toBe(false);
  });

  it('reports isError without a pacienteId when /pacientes/me fails', async () => {
    (prescriptionsApi.getMyPatientProfile as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const client = createTestQueryClient();
    const { result } = await renderHook(() => usePatientId(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.pacienteId).toBeUndefined();
  });
});
