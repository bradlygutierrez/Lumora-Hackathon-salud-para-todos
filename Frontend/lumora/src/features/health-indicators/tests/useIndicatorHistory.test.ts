jest.mock('@/features/health-indicators/api/health-indicators-api', () => ({
  healthIndicatorsApi: {
    getIndicators: jest.fn(),
    getIndicatorRanges: jest.fn(),
    getPatientMeasurements: jest.fn(),
    getPatientAlerts: jest.fn(),
  },
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import { useIndicatorHistory } from '@/features/health-indicators/hooks/useIndicatorHistory';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

const PRESION_ID = 'ind-presion';
const PESO_ID = 'ind-peso';

describe('useIndicatorHistory (historial + límites clínicos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    (healthIndicatorsApi.getIndicators as jest.Mock).mockResolvedValue([
      {
        id: PRESION_ID,
        codigo: 'presion_arterial_sistolica',
        nombre: 'Presión arterial (sistólica)',
        unidad_medida_id: 1,
        descripcion: null,
        activo: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: PESO_ID,
        codigo: 'peso',
        nombre: 'Peso',
        unidad_medida_id: 2,
        descripcion: null,
        activo: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    (healthIndicatorsApi.getIndicatorRanges as jest.Mock).mockImplementation(
      (indicadorId: string) => {
        if (indicadorId === PRESION_ID) {
          return Promise.resolve([
            {
              id: 'rango-presion',
              indicador_id: PRESION_ID,
              nivel_severidad_id: 2,
              valor_minimo: 90,
              valor_maximo: 120,
              etiqueta: 'Fuera de rango',
              activo: true,
            },
          ]);
        }

        // Peso a propósito no tiene rango saludable (ver seed_health_indicators).
        return Promise.resolve([]);
      },
    );

    (healthIndicatorsApi.getPatientMeasurements as jest.Mock).mockResolvedValue([
      {
        id: 'm-1',
        paciente_id: 7,
        indicador_id: PRESION_ID,
        valor: 118,
        unidad_medida_id: 1,
        origen_registro_id: 1,
        registrado_por_id: 7,
        fecha_medicion: '2026-08-20T08:00:00Z',
        observaciones: null,
      },
      {
        id: 'm-2',
        paciente_id: 7,
        indicador_id: PRESION_ID,
        valor: 145,
        unidad_medida_id: 1,
        origen_registro_id: 1,
        registrado_por_id: 7,
        fecha_medicion: '2026-08-25T08:00:00Z',
        observaciones: null,
      },
      {
        id: 'm-3',
        paciente_id: 7,
        indicador_id: PESO_ID,
        valor: 70,
        unidad_medida_id: 2,
        origen_registro_id: 1,
        registrado_por_id: 7,
        fecha_medicion: '2026-08-26T08:00:00Z',
        observaciones: null,
      },
    ]);

    // La alerta que generó FastAPI para m-2 (145 mmHg, fuera del rango 90-120).
    (healthIndicatorsApi.getPatientAlerts as jest.Mock).mockResolvedValue([
      {
        id: 'alerta-1',
        paciente_id: 7,
        medicion_id: 'm-2',
        nivel_severidad_id: 2,
        tipo_alerta_id: 1,
        origen_registro_id: 1,
        mensaje: 'Presión arterial fuera de rango',
        atendida: true,
        atendida_por_id: 3,
        fecha_alerta: '2026-08-25T08:05:00Z',
        fecha_atencion: '2026-08-25T09:00:00Z',
      },
    ]);
  });

  it('marks a measurement as "fuera_de_rango" when FastAPI generated an alert for it, even if already attended', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useIndicatorHistory(PRESION_ID), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const m2 = result.current.entries.find((entry) => entry.id === 'm-2');
    expect(m2?.evaluacion).toBe('fuera_de_rango');

    const m1 = result.current.entries.find((entry) => entry.id === 'm-1');
    expect(m1?.evaluacion).toBe('normal');
  });

  it('exposes the most recent measurement as ultimaMedicion and orders entries newest-first', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useIndicatorHistory(PRESION_ID), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ultimaMedicion?.id).toBe('m-2');
    expect(result.current.entries.map((entry) => entry.id)).toEqual(['m-2', 'm-1']);
  });

  it('builds tendencia in chronological order (oldest first)', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useIndicatorHistory(PRESION_ID), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tendencia.map((point) => point.valor)).toEqual([118, 145]);
  });

  it('marks measurements as "sin_rango" when the indicator has no rango defined (ej. Peso)', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useIndicatorHistory(PESO_ID), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].evaluacion).toBe('sin_rango');
  });
});
