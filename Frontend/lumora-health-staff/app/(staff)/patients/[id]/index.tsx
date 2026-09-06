import { useLocalSearchParams } from 'expo-router';

import { PatientDetailScreen } from '@/src/features/patients/screens/PatientDetailScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

export default function PatientDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const patientId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return <ErrorState title="Paciente inválido" message="El identificador del paciente no es válido." />;
  }
  return <PatientDetailScreen patientId={patientId} />;
}
