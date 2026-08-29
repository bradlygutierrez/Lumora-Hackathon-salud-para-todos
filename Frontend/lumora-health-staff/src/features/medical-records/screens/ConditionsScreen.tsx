import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ErrorState } from '@/src/shared/components/RemoteState';
import { StructuredRecordList } from '../components/StructuredRecordList';
import {
  activeFilterValue,
  catalogName,
  formatClinicalDate,
  structuredHistoryErrorMessage,
} from '../components/structured-history.ui';
import {
  useConditions,
  useConditionStatuses,
  useDeleteCondition,
} from '../hooks/use-structured-history';

const LIMIT = 20;

export function ConditionsScreen({ patientId, recordId }: { patientId: number; recordId: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [filterValue, setFilterValue] = useState(1);
  const [offset, setOffset] = useState(0);
  const conditions = useConditions(
    recordId,
    { limit: LIMIT, offset, activo: activeFilterValue(filterValue) },
    allowed,
  );
  const statuses = useConditionStatuses(allowed);
  const deletion = useDeleteCondition(recordId, patientId);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para gestionar condiciones clínicas."
      />
    );
  }

  const rows = (conditions.data?.items ?? []).map((condition) => ({
    id: condition.id,
    title: condition.nombre,
    meta: `Estado: ${catalogName(statuses.data?.items, condition.estado_condicion_id)} · Inicio: ${formatClinicalDate(condition.fecha_inicio)}${condition.fecha_fin ? ` · Fin: ${formatClinicalDate(condition.fecha_fin)}` : ''}`,
    detail: condition.descripcion,
    activo: condition.activo,
  }));

  const confirmDelete = (conditionId: number) => {
    const condition = conditions.data?.items.find((item) => item.id === conditionId);
    Alert.alert(
      'Confirmar borrado lógico',
      `Se eliminará ${condition?.nombre ?? 'esta condición'} de las vistas clínicas activas. Esta acción usa el DELETE con borrado lógico de J04.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deletion.mutateAsync(conditionId).catch(() => undefined),
        },
      ],
    );
  };

  return (
    <StructuredRecordList
      createLabel="Añadir condición médica"
      deleteError={structuredHistoryErrorMessage(deletion.error, 'eliminar condiciones clínicas')}
      deleting={deletion.isPending}
      emptyMessage="No hay condiciones para el filtro seleccionado."
      emptyTitle="Sin condiciones"
      errorMessage={structuredHistoryErrorMessage(
        conditions.error ?? statuses.error,
        'consultar condiciones clínicas',
      )}
      filterValue={filterValue}
      isError={conditions.isError || statuses.isError}
      isLoading={conditions.isLoading || statuses.isLoading}
      limit={LIMIT}
      offset={offset}
      onBack={() => router.back()}
      onCreate={() =>
        router.push(
          `/(staff)/patients/${patientId}/record/conditions/new?recordId=${recordId}` as Href,
        )
      }
      onDelete={confirmDelete}
      onEdit={(conditionId) =>
        router.push(
          `/(staff)/patients/${patientId}/record/conditions/${conditionId}/edit?recordId=${recordId}` as Href,
        )
      }
      onFilterChange={(value) => {
        setFilterValue(value ?? 1);
        setOffset(0);
      }}
      onHistory={(conditionId) =>
        router.push(
          `/(staff)/patients/${patientId}/record/conditions/${conditionId}/history?recordId=${recordId}` as Href,
        )
      }
      onNext={() => setOffset((current) => current + LIMIT)}
      onPrevious={() => setOffset((current) => Math.max(0, current - LIMIT))}
      rows={rows}
      subtitle="Condiciones médicas del expediente y su estado clínico."
      title="Condiciones del Paciente"
      total={conditions.data?.total ?? 0}
    />
  );
}
