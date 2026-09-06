import { useLocalSearchParams } from 'expo-router';
import { ConsultationDetailScreen } from '@/src/features/consultations/screens/ConsultationDetailScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default function ConsultationDetailRoute() {
  const { id, consultationId } = useLocalSearchParams<{ id: string | string[]; consultationId: string | string[] }>();
  const patientId = Number(first(id));
  const parsedConsultationId = Number(first(consultationId));
  if (![patientId, parsedConsultationId].every((value) => Number.isFinite(value) && value > 0)) return <ErrorState title="Consulta inválida" message="No se pudo identificar la consulta clínica." />;
  return <ConsultationDetailScreen consultationId={parsedConsultationId} patientId={patientId} />;
}
