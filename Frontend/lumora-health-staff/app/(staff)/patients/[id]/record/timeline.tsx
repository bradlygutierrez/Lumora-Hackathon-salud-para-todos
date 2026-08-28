import { useLocalSearchParams } from 'expo-router';

import { MedicalTimelineScreen } from '@/src/features/medical-records/screens/MedicalTimelineScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function MedicalTimelineRoute() {
  const { id, recordId } = useLocalSearchParams<{
    id: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(firstParam(id));
  const parsedRecordId = Number(firstParam(recordId));

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return (
      <ErrorState
        title="Paciente inválido"
        message="El identificador del paciente no es válido."
      />
    );
  }

  if (!Number.isFinite(parsedRecordId) || parsedRecordId <= 0) {
    return (
      <ErrorState
        title="Expediente inválido"
        message="El identificador del expediente no es válido."
      />
    );
  }

  return <MedicalTimelineScreen patientId={patientId} recordId={parsedRecordId} />;
}
