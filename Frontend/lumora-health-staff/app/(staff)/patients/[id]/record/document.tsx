import { useLocalSearchParams } from 'expo-router';

import { MedicalRecordDocumentScreen } from '@/src/features/medical-records/screens/MedicalRecordDocumentScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

export default function MedicalRecordDocumentRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const patientId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return (
      <ErrorState
        title="Paciente inválido"
        message="El identificador del paciente no es válido."
      />
    );
  }

  return <MedicalRecordDocumentScreen patientId={patientId} />;
}
