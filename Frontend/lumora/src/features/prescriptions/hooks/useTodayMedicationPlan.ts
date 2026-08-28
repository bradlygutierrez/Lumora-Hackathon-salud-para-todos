import {
  useQueries,
  useQuery,
} from '@tanstack/react-query';

import {
  prescriptionsApi,
} from '@/features/prescriptions/api/prescriptions-api';

import {
  schedulesApi,
} from '@/features/prescriptions/api/schedules-api';

import {
  useDoseStatusCatalog,
  useMedicationsCatalog,
  usePrescriptionStatusCatalog,
} from '@/features/prescriptions/hooks/useCatalog';

import type {
  DosisAdministradaResponse,
  HorarioMedicamentoResponse,
  TimeOfDayBucket,
  TodayMedicationItem,
  TodayMedicationPlan,
} from '@/features/prescriptions/types/prescriptions.types';

import {
  bucketForHora,
  horaToMinutes,
  isSameLocalDay,
} from '@/features/prescriptions/utils/time-of-day';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

import {
  patientQueryKeys,
} from '@/features/shell/query/patient-query-keys';

const EMPTY_SECTIONS: Record<TimeOfDayBucket, TodayMedicationItem[]> = {
  manana: [],
  tarde: [],
  noche: [],
};

/**
 * Arma el Plan de Hoy para el patientContext activo de B09.
 *
 * Antes resolvía el paciente con GET /pacientes/me, lo cual funcionaba
 * únicamente para rol Paciente. B10 enlaza Inicio cuidador con Medicación,
 * por lo que esta integración debe respetar `activePatient` y funcionar
 * también para cuidadores autorizados.
 */
export function useTodayMedicationPlan() {
  const {
    status: shellStatus,
    activePatient,
  } = useShellContext();

  const pacienteId = activePatient?.patientId;
  const medicationQueryKey =
    pacienteId !== undefined
      ? patientQueryKeys.medication(pacienteId)
      : (['patient', 'medication', 'unresolved'] as const);

  const prescriptionsQuery = useQuery({
    queryKey: medicationQueryKey,
    queryFn: () =>
      prescriptionsApi.getPrescriptionsByPatient(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const statusCatalog = usePrescriptionStatusCatalog();
  const doseStatusCatalog = useDoseStatusCatalog();
  const medicationsCatalog = useMedicationsCatalog();

  const activeEstadoId = statusCatalog.idByName('Activa');
  const tomadaEstadoId = doseStatusCatalog.idByName('Tomada');

  const activePrescriptions = (prescriptionsQuery.data ?? []).filter(
    (receta) => activeEstadoId !== undefined && receta.estado_id === activeEstadoId,
  );

  const activeDetails = activePrescriptions.flatMap((receta) =>
    receta.detalles.map((detalle) => ({
      ...detalle,
      recetaId: receta.id,
    })),
  );

  const horariosQueries = useQueries({
    queries: activeDetails.map((detalle) => ({
      queryKey: [...medicationQueryKey, 'horarios', detalle.id],
      queryFn: () => schedulesApi.getHorarios(detalle.id),
    })),
  });

  type HorarioWithParent = HorarioMedicamentoResponse & {
    recetaId: string;
    detalleRecetaId: string;
    dosis: string;
    frecuencia: string;
    medicamentoId: string;
  };

  const activeHorarios: HorarioWithParent[] = horariosQueries.flatMap(
    (query, index) => {
      const detalle = activeDetails[index];
      const horarios = query.data ?? [];

      return horarios
        .filter((horario) => horario.activo)
        .map((horario) => ({
          ...horario,
          recetaId: detalle.recetaId,
          detalleRecetaId: detalle.id,
          dosis: detalle.dosis,
          frecuencia: detalle.frecuencia,
          medicamentoId: detalle.medicamento_id,
        }));
    },
  );

  const dosisQueries = useQueries({
    queries: activeHorarios.map((horario) => ({
      queryKey: [...medicationQueryKey, 'dosis-logs', horario.id],
      queryFn: () => schedulesApi.getDosisLogs(horario.id),
    })),
  });

  const today = new Date();

  const items: TodayMedicationItem[] = activeHorarios.map((horario, index) => {
    const dosisLogs: DosisAdministradaResponse[] = dosisQueries[index]?.data ?? [];

    const dosisHoy = dosisLogs.find(
      (log) =>
        tomadaEstadoId !== undefined &&
        log.estado_dosis_id === tomadaEstadoId &&
        isSameLocalDay(new Date(log.fecha_programada), today),
    );

    return {
      horarioId: horario.id,
      detalleRecetaId: horario.detalleRecetaId,
      recetaId: horario.recetaId,
      medicamentoNombre: medicationsCatalog.nameById(horario.medicamentoId),
      dosis: horario.dosis,
      frecuencia: horario.frecuencia,
      hora: horario.hora,
      status: dosisHoy ? 'tomada' : 'pendiente',
      dosisHoyId: dosisHoy?.id ?? null,
    };
  });

  const sections: Record<TimeOfDayBucket, TodayMedicationItem[]> = {
    manana: [],
    tarde: [],
    noche: [],
  };

  for (const item of items) {
    sections[bucketForHora(item.hora)].push(item);
  }

  for (const bucket of Object.keys(sections) as TimeOfDayBucket[]) {
    sections[bucket].sort(
      (a, b) => horaToMinutes(a.hora) - horaToMinutes(b.hora),
    );
  }

  const plan: TodayMedicationPlan = {
    sections: items.length > 0 ? sections : EMPTY_SECTIONS,
    completedCount: items.filter((item) => item.status === 'tomada').length,
    totalCount: items.length,
  };

  const isLoading =
    shellStatus === 'idle' ||
    shellStatus === 'loading' ||
    prescriptionsQuery.isLoading ||
    statusCatalog.isLoading ||
    doseStatusCatalog.isLoading ||
    medicationsCatalog.isLoading ||
    horariosQueries.some((query) => query.isLoading) ||
    dosisQueries.some((query) => query.isLoading);

  const isError =
    shellStatus === 'error' ||
    !activePatient ||
    prescriptionsQuery.isError ||
    statusCatalog.isError ||
    doseStatusCatalog.isError ||
    medicationsCatalog.isError ||
    horariosQueries.some((query) => query.isError) ||
    dosisQueries.some((query) => query.isError);

  const refetch = () => {
    void prescriptionsQuery.refetch();
    void Promise.all(horariosQueries.map((query) => query.refetch()));
    void Promise.all(dosisQueries.map((query) => query.refetch()));
  };

  return {
    plan,
    isLoading,
    isError,
    refetch,
    planDate: today,
  };
}
