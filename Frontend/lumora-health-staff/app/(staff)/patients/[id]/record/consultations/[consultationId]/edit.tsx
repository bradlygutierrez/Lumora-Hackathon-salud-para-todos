import { useLocalSearchParams } from 'expo-router';
import { ConsultationFormScreen } from '@/src/features/consultations/screens/ConsultationFormScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default function EditConsultationRoute() {
  const { id, consultationId, recordId } = useLocalSearchParams<{ id: string | string[]; consultationId: string | string[]; recordId?: string | string[] }>();
  const patientId = Number(first(id));
  const parsedConsultationId = Number(first(consultationId));
  const parsedRecordId = Number(first(recordId));
  if (![patientId, parsedConsultationId, parsedRecordId].every((value) => Number.isFinite(value) && value > 0)) return <ErrorState title="Consulta inválida" message="No se pudo identificar la consulta o expediente." />;
  return <ConsultationFormScreen consultationId={parsedConsultationId} patientId={patientId} recordId={parsedRecordId} />;
}
