import { useLocalSearchParams } from 'expo-router';

import { MedicalRecordDiagnosesScreen } from '@/src/features/medical-records/screens/MedicalRecordDiagnosesScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function MedicalRecordDiagnosesRoute() {
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
    <MedicalRecordDiagnosesScreen
      patientId={patientId}
      recordId={recordId}
    />
  );
}
