import { useLocalSearchParams } from 'expo-router';

import { PrescriptionsScreen } from '@/src/features/prescriptions/screens/PrescriptionsScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PrescriptionsRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(first(params.id));
  const parsedRecordId = Number(first(params.recordId));
  const recordId =
    Number.isFinite(parsedRecordId) && parsedRecordId > 0
      ? parsedRecordId
      : undefined;

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return (
      <ErrorState
        title="Paciente inválido"
        message="No se pudo identificar el paciente de las recetas."
      />
    );
  }
  return <PrescriptionsScreen patientId={patientId} recordId={recordId} />;
}
