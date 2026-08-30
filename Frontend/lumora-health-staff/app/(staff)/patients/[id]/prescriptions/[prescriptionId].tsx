import { useLocalSearchParams } from 'expo-router';

import { PrescriptionDetailScreen } from '@/src/features/prescriptions/screens/PrescriptionDetailScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PrescriptionDetailRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    prescriptionId: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(first(params.id));
  const prescriptionId = first(params.prescriptionId) ?? '';
  const parsedRecordId = Number(first(params.recordId));
  const recordId =
    Number.isFinite(parsedRecordId) && parsedRecordId > 0
      ? parsedRecordId
      : undefined;

  if (!Number.isFinite(patientId) || patientId <= 0 || !prescriptionId) {
    return (
      <ErrorState
        title="Receta inválida"
        message="No se pudo identificar el paciente o la receta."
      />
    );
  }
  return (
    <PrescriptionDetailScreen
      patientId={patientId}
      prescriptionId={prescriptionId}
      recordId={recordId}
    />
  );
}
