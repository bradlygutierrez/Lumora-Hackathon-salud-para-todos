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
  useAllergies,
  useConditionStatuses,
  useDeleteAllergy,
  useSeverityLevels,
} from '../hooks/use-structured-history';

const LIMIT = 20;

export function AllergiesScreen({ patientId, recordId }: { patientId: number; recordId: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [filterValue, setFilterValue] = useState(1);
  const [offset, setOffset] = useState(0);
  const allergies = useAllergies(
    patientId,
    { limit: LIMIT, offset, activo: activeFilterValue(filterValue) },
    allowed,
  );
  const statuses = useConditionStatuses(allowed);
  const severities = useSeverityLevels(allowed);
  const deletion = useDeleteAllergy(patientId, recordId);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para gestionar alergias clínicas."
      />
    );
  }

  const rows = (allergies.data?.items ?? []).map((allergy) => ({
    id: allergy.id,
    title: allergy.nombre,
    meta: `Severidad: ${catalogName(severities.data?.items, allergy.nivel_severidad_id)} · Estado: ${catalogName(statuses.data?.items, allergy.estado_condicion_id)}`,
    detail: allergy.observaciones,
    activo: allergy.activo,
  }));

  const confirmDelete = (allergyId: number) => {
    const allergy = allergies.data?.items.find((item) => item.id === allergyId);
    Alert.alert(
      'Confirmar borrado lógico',
      `Se eliminará ${allergy?.nombre ?? 'esta alergia'} de las vistas clínicas activas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deletion.mutateAsync(allergyId).catch(() => undefined),
        },
      ],
    );
  };

  const catalogError = statuses.error ?? severities.error;

  return (
    <StructuredRecordList
      createLabel="Añadir alergia"
      deleteError={structuredHistoryErrorMessage(deletion.error, 'eliminar alergias')}
      deleting={deletion.isPending}
      emptyMessage="No hay alergias para el filtro seleccionado."
      emptyTitle="Sin alergias"
      errorMessage={structuredHistoryErrorMessage(
        allergies.error ?? catalogError,
        'consultar alergias',
      )}
      filterValue={filterValue}
      isError={allergies.isError || statuses.isError || severities.isError}
      isLoading={allergies.isLoading || statuses.isLoading || severities.isLoading}
      limit={LIMIT}
      offset={offset}
      onBack={() => router.back()}
      onCreate={() =>
        router.push(
          `/(staff)/patients/${patientId}/record/allergies/new?recordId=${recordId}` as Href,
        )
      }
      onDelete={confirmDelete}
      onEdit={(allergyId) =>
        router.push(
          `/(staff)/patients/${patientId}/record/allergies/${allergyId}/edit?recordId=${recordId}` as Href,
        )
      }
      onFilterChange={(value) => {
        setFilterValue(value ?? 1);
        setOffset(0);
      }}
      onNext={() => setOffset((current) => current + LIMIT)}
      onPrevious={() => setOffset((current) => Math.max(0, current - LIMIT))}
      rows={rows}
      subtitle="Alergias registradas para el paciente, con severidad y estado desde los catálogos clínicos."
      title="Alergias del Paciente"
      total={allergies.data?.total ?? 0}
    />
  );
}
