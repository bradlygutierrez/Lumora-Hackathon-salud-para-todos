import { useLocalSearchParams } from 'expo-router';
import { ConsultationFormScreen } from '@/src/features/consultations/screens/ConsultationFormScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default function NewConsultationRoute() {
  const { id, recordId } = useLocalSearchParams<{ id: string | string[]; recordId?: string | string[] }>();
  const patientId = Number(first(id));
  const parsedRecordId = Number(first(recordId));
  if (!Number.isFinite(patientId) || patientId <= 0 || !Number.isFinite(parsedRecordId) || parsedRecordId <= 0) return <ErrorState title="Datos clínicos inválidos" message="Paciente o expediente inválido." />;
  return <ConsultationFormScreen patientId={patientId} recordId={parsedRecordId} />;
}
