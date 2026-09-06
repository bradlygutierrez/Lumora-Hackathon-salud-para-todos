import { useLocalSearchParams } from 'expo-router';

import { DiagnosesScreen } from '@/src/features/diagnoses/screens/DiagnosesScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DiagnosesRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    consultationId: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(first(params.id));
  const consultationId = Number(first(params.consultationId));
  const recordId = Number(first(params.recordId));

  if (
    !Number.isFinite(patientId) ||
    patientId <= 0 ||
    !Number.isFinite(consultationId) ||
    consultationId <= 0 ||
    !Number.isFinite(recordId) ||
    recordId <= 0
  ) {
    return (
      <ErrorState
        title="Contexto clínico inválido"
        message="No se pudo identificar el paciente, la consulta o el expediente."
      />
    );
  }

  return (
    <DiagnosesScreen
      consultationId={consultationId}
      patientId={patientId}
      recordId={recordId}
    />
  );
}
