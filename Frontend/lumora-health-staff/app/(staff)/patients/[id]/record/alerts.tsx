import { useLocalSearchParams } from 'expo-router';

import { MedicalRecordAlertsScreen } from '@/src/features/medical-records/screens/MedicalRecordAlertsScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function MedicalRecordAlertsRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(first(params.id));
  const recordId = Number(first(params.recordId));

  if (
    !Number.isFinite(patientId) ||
    patientId <= 0 ||
    !Number.isFinite(recordId) ||
    recordId <= 0
  ) {
    return (
      <ErrorState
        title="Contexto clínico inválido"
        message="No se pudo identificar el paciente o el expediente."
      />
    );
  }

  return (
    <MedicalRecordAlertsScreen
      patientId={patientId}
      recordId={recordId}
    />
  );
}
