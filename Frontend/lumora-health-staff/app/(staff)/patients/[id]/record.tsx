import { useLocalSearchParams } from 'expo-router';

import { PatientRecordEntryScreen } from '@/src/features/patients/screens/PatientRecordEntryScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

export default function PatientRecordRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const patientId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return <ErrorState title="Paciente inválido" message="El identificador del paciente no es válido." />;
  }
  return <PatientRecordEntryScreen patientId={patientId} />;
}
