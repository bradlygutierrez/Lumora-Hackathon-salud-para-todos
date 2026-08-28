import { useLocalSearchParams } from 'expo-router';

import { PatientFamilyScreen } from '@/src/features/patients/screens/PatientFamilyScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

export default function PatientFamilyRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const patientId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return <ErrorState title="Paciente inválido" message="El identificador del paciente no es válido." />;
  }
  return <PatientFamilyScreen patientId={patientId} />;
}
