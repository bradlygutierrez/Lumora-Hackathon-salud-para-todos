jest.mock('@/features/prescriptions/api/prescriptions-api', () => ({
  prescriptionsApi: {
    getMyPatientProfile: jest.fn(),
    getPrescriptionsByPatient: jest.fn(),
    getPrescriptionStatuses: jest.fn(),
    getDoseStatuses: jest.fn(),
    getMedications: jest.fn(),
  },
}));

jest.mock('@/features/prescriptions/api/schedules-api', () => ({
  schedulesApi: {
    getHorarios: jest.fn(),
    getDosisLogs: jest.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';
import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import { useTodayMedicationPlan } from '@/features/prescriptions/hooks/useTodayMedicationPlan';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/prescriptions/tests/query-test-utils';

const todayIso = new Date().toISOString();

describe('useTodayMedicationPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (prescriptionsApi.getMyPatientProfile as jest.Mock).mockResolvedValue({
      id: 7,
      tipo_sangre_id: null,
      alergias: null,
      persona: { id: 1, nombres: 'Ana', apellidos: 'Zepeda' },
    });

    (prescriptionsApi.getPrescriptionStatuses as jest.Mock).mockResolvedValue({
      items: [
        { id: 1, nombre: 'Activa' },
        { id: 2, nombre: 'Completada' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    (prescriptionsApi.getDoseStatuses as jest.Mock).mockResolvedValue({
      items: [
        { id: 1, nombre: 'Tomada' },
        { id: 2, nombre: 'Pendiente' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    (prescriptionsApi.getMedications as jest.Mock).mockResolvedValue([
      { id: 'med-1', nombre: 'Metformina', activo: true, created_at: todayIso },
      { id: 'med-2', nombre: 'Lisinopril', activo: true, created_at: todayIso },
    ]);

    (prescriptionsApi.getPrescriptionsByPatient as jest.Mock).mockResolvedValue([
      {
        id: 'receta-1',
        paciente_id: 7,
        profesional_id: 1,
        consulta_id: null,
        estado_id: 1, // Activa
        titulo: 'Tratamiento',
        fecha_emision: todayIso,
        vigencia_hasta: null,
        observaciones: null,
        created_at: todayIso,
        profesional: {
          id: 1,
          especialidad: 'Medicina interna',
          numero_licencia: '123',
          persona: { id: 2, nombres: 'Emilio', apellidos: 'Cárdenas' },
        },
        detalles: [
          {
            id: 'det-1',
            receta_id: 'receta-1',
            medicamento_id: 'med-1',
            unidad_medida_id: 1,
            via_administracion_id: 1,
            dosis: '500mg',
            frecuencia: 'Tomar con desayuno',
            duracion_dias: 30,
            cantidad_total: 30,
            instrucciones: null,
          },
          {
            id: 'det-2',
            receta_id: 'receta-1',
            medicamento_id: 'med-2',
            unidad_medida_id: 1,
            via_administracion_id: 1,
            dosis: '10mg',
            frecuencia: 'Antes de dormir',
            duracion_dias: 30,
            cantidad_total: 30,
            instrucciones: null,
          },
        ],
      },
    ]);

    (schedulesApi.getHorarios as jest.Mock).mockImplementation((detalleId: string) => {
      if (detalleId === 'det-1') {
        return Promise.resolve([
          { id: 'hor-1', detalle_receta_id: 'det-1', hora: '08:00:00', activo: true, created_at: todayIso },
        ]);
      }

      return Promise.resolve([
        { id: 'hor-2', detalle_receta_id: 'det-2', hora: '20:00:00', activo: true, created_at: todayIso },
      ]);
    });

    (schedulesApi.getDosisLogs as jest.Mock).mockImplementation((horarioId: string) => {
      if (horarioId === 'hor-1') {
        return Promise.resolve([
          {
            id: 'dosis-1',
            horario_id: 'hor-1',
            estado_dosis_id: 1, // Tomada
            fecha_programada: todayIso,
            fecha_registro: todayIso,
            responsable_id: 99,
            origen_registro_id: 1,
            observaciones: null,
          },
        ]);
      }

      return Promise.resolve([]); // hor-2 sin registrar -> Pendiente
    });
  });

  it('groups today\'s schedules by time of day and resolves dose status', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useTodayMedicationPlan(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.plan.totalCount).toBe(2);
    expect(result.current.plan.completedCount).toBe(1);

    expect(result.current.plan.sections.manana).toHaveLength(1);
    expect(result.current.plan.sections.manana[0]).toMatchObject({
      medicamentoNombre: 'Metformina',
      status: 'tomada',
      recetaId: 'receta-1',
    });

    expect(result.current.plan.sections.tarde).toHaveLength(0);

    expect(result.current.plan.sections.noche).toHaveLength(1);
    expect(result.current.plan.sections.noche[0]).toMatchObject({
      medicamentoNombre: 'Lisinopril',
      status: 'pendiente',
      recetaId: 'receta-1',
    });
  });

  it('excludes prescriptions that are not "Activa"', async () => {
    (prescriptionsApi.getPrescriptionsByPatient as jest.Mock).mockResolvedValue([
      {
        id: 'receta-vencida',
        paciente_id: 7,
        profesional_id: 1,
        consulta_id: null,
        estado_id: 2, // Completada, no debe aparecer en el plan de hoy
        titulo: 'Tratamiento viejo',
        fecha_emision: todayIso,
        vigencia_hasta: null,
        observaciones: null,
        created_at: todayIso,
        profesional: {
          id: 1,
          especialidad: 'Medicina interna',
          numero_licencia: '123',
          persona: { id: 2, nombres: 'Emilio', apellidos: 'Cárdenas' },
        },
        detalles: [],
      },
    ]);

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useTodayMedicationPlan(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.plan.totalCount).toBe(0);
  });
});
