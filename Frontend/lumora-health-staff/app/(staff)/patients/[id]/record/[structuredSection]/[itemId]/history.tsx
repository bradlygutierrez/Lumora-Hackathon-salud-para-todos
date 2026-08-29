import { useLocalSearchParams } from 'expo-router';

import { ConditionHistoryScreen } from '@/src/features/medical-records/screens/ConditionHistoryScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ConditionHistoryRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    structuredSection: string | string[];
    itemId: string | string[];
    recordId?: string | string[];
  }>();
  const recordId = Number(first(params.recordId));
  const conditionId = Number(first(params.itemId));
  const section = first(params.structuredSection);

  if (section !== 'conditions') {
    return (
      <ErrorState
        title="Historial no disponible"
        message="La trazabilidad de cambios de J04 aplica a condiciones médicas."
      />
    );
  }
  if (!Number.isFinite(recordId) || recordId <= 0 || !Number.isFinite(conditionId) || conditionId <= 0) {
    return <ErrorState title="Condición inválida" message="El identificador de la condición no es válido." />;
  }

  return <ConditionHistoryScreen conditionId={conditionId} recordId={recordId} />;
}
