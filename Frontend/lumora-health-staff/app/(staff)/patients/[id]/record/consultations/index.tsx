import { useLocalSearchParams } from 'expo-router';

import { ConsultationHistoryScreen } from '@/src/features/consultations/screens/ConsultationHistoryScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default function ConsultationHistoryRoute() {
  const { id, recordId } = useLocalSearchParams<{ id: string | string[]; recordId?: string | string[] }>();
  const patientId = Number(first(id));
  const parsedRecordId = Number(first(recordId));
  if (!Number.isFinite(patientId) || patientId <= 0) return <ErrorState title="Paciente inválido" message="El identificador del paciente no es válido." />;
  if (!Number.isFinite(parsedRecordId) || parsedRecordId <= 0) return <ErrorState title="Expediente inválido" message="El identificador del expediente no es válido." />;
  return <ConsultationHistoryScreen patientId={patientId} recordId={parsedRecordId} />;
}
