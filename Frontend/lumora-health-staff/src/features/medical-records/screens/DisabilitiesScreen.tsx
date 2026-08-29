import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ErrorState } from '@/src/shared/components/RemoteState';
import { StructuredRecordList } from '../components/StructuredRecordList';
import {
  activeFilterValue,
  catalogName,
  structuredHistoryErrorMessage,
} from '../components/structured-history.ui';
import {
  useConditionStatuses,
  useDeleteDisability,
  useDisabilities,
} from '../hooks/use-structured-history';

const LIMIT = 20;

export function DisabilitiesScreen({ patientId, recordId }: { patientId: number; recordId: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [filterValue, setFilterValue] = useState(1);
  const [offset, setOffset] = useState(0);
  const disabilities = useDisabilities(
    patientId,
    { limit: LIMIT, offset, activo: activeFilterValue(filterValue) },
    allowed,
  );
  const statuses = useConditionStatuses(allowed);
  const deletion = useDeleteDisability(patientId, recordId);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para gestionar discapacidades clínicas."
      />
    );
  }

  const rows = (disabilities.data?.items ?? []).map((disability) => ({
    id: disability.id,
    title: disability.nombre,
    meta: `Estado: ${catalogName(statuses.data?.items, disability.estado_condicion_id)}`,
    detail: disability.observaciones,
    activo: disability.activo,
  }));

  const confirmDelete = (disabilityId: number) => {
    const disability = disabilities.data?.items.find((item) => item.id === disabilityId);
    Alert.alert(
      'Confirmar borrado lógico',
      `Se eliminará ${disability?.nombre ?? 'esta discapacidad'} de las vistas clínicas activas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deletion.mutateAsync(disabilityId).catch(() => undefined),
        },
      ],
    );
  };

  return (
    <StructuredRecordList
      createLabel="Añadir discapacidad"
      deleteError={structuredHistoryErrorMessage(deletion.error, 'eliminar discapacidades')}
      deleting={deletion.isPending}
      emptyMessage="No hay discapacidades para el filtro seleccionado."
      emptyTitle="Sin discapacidades"
      errorMessage={structuredHistoryErrorMessage(
        disabilities.error ?? statuses.error,
        'consultar discapacidades',
      )}
      filterValue={filterValue}
      isError={disabilities.isError || statuses.isError}
      isLoading={disabilities.isLoading || statuses.isLoading}
      limit={LIMIT}
      offset={offset}
      onBack={() => router.back()}
      onCreate={() =>
        router.push(
          `/(staff)/patients/${patientId}/record/disabilities/new?recordId=${recordId}` as Href,
        )
      }
      onDelete={confirmDelete}
      onEdit={(disabilityId) =>
        router.push(
          `/(staff)/patients/${patientId}/record/disabilities/${disabilityId}/edit?recordId=${recordId}` as Href,
        )
      }
      onFilterChange={(value) => {
        setFilterValue(value ?? 1);
        setOffset(0);
      }}
      onNext={() => setOffset((current) => current + LIMIT)}
      onPrevious={() => setOffset((current) => Math.max(0, current - LIMIT))}
      rows={rows}
      subtitle="Discapacidades registradas para el paciente con estado clínico controlado por FastAPI."
      title="Discapacidades del Paciente"
      total={disabilities.data?.total ?? 0}
    />
  );
}
