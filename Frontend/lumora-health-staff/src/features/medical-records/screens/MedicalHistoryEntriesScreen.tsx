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
  useDeleteMedicalHistoryEntry,
  useMedicalHistoryEntries,
  useMedicalHistoryTypes,
} from '../hooks/use-structured-history';

const LIMIT = 20;

export function MedicalHistoryEntriesScreen({
  patientId,
  recordId,
}: {
  patientId: number;
  recordId: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [filterValue, setFilterValue] = useState(1);
  const [offset, setOffset] = useState(0);
  const history = useMedicalHistoryEntries(
    recordId,
    { limit: LIMIT, offset, activo: activeFilterValue(filterValue) },
    allowed,
  );
  const types = useMedicalHistoryTypes(allowed);
  const deletion = useDeleteMedicalHistoryEntry(patientId, recordId);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para gestionar antecedentes médicos."
      />
    );
  }

  const rows = (history.data?.items ?? []).map((entry) => ({
    id: entry.id,
    title: entry.descripcion,
    meta: `Tipo: ${catalogName(types.data?.items, entry.tipo_antecedente_id)} · Fecha: ${formatClinicalDate(entry.fecha)}`,
    activo: entry.activo,
  }));

  const confirmDelete = (historyId: number) => {
    const entry = history.data?.items.find((item) => item.id === historyId);
    Alert.alert(
      'Confirmar borrado lógico',
      `Se eliminará ${entry?.descripcion ?? 'este antecedente'} de las vistas clínicas activas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deletion.mutateAsync(historyId).catch(() => undefined),
        },
      ],
    );
  };

  return (
    <StructuredRecordList
      createLabel="Añadir antecedente médico"
      deleteError={structuredHistoryErrorMessage(deletion.error, 'eliminar antecedentes médicos')}
      deleting={deletion.isPending}
      emptyMessage="No hay antecedentes para el filtro seleccionado."
      emptyTitle="Sin antecedentes"
      errorMessage={structuredHistoryErrorMessage(
        history.error ?? types.error,
        'consultar antecedentes médicos',
      )}
      filterValue={filterValue}
      isError={history.isError || types.isError}
      isLoading={history.isLoading || types.isLoading}
      limit={LIMIT}
      offset={offset}
      onBack={() => router.back()}
      onCreate={() =>
        router.push(
          `/(staff)/patients/${patientId}/record/history/new?recordId=${recordId}` as Href,
        )
      }
      onDelete={confirmDelete}
      onEdit={(historyId) =>
        router.push(
          `/(staff)/patients/${patientId}/record/history/${historyId}/edit?recordId=${recordId}` as Href,
        )
      }
      onFilterChange={(value) => {
        setFilterValue(value ?? 1);
        setOffset(0);
      }}
      onNext={() => setOffset((current) => current + LIMIT)}
      onPrevious={() => setOffset((current) => Math.max(0, current - LIMIT))}
      rows={rows}
      subtitle="Antecedentes estructurados del expediente, clasificados por tipo."
      title="Historial Médico"
      total={history.data?.total ?? 0}
    />
  );
}
