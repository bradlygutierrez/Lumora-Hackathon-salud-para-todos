import { useLocalSearchParams } from 'expo-router';

import { AllergyFormScreen } from '@/src/features/medical-records/screens/AllergyFormScreen';
import { ConditionFormScreen } from '@/src/features/medical-records/screens/ConditionFormScreen';
import { DisabilityFormScreen } from '@/src/features/medical-records/screens/DisabilityFormScreen';
import { MedicalHistoryFormScreen } from '@/src/features/medical-records/screens/MedicalHistoryFormScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function StructuredHistoryCreateRoute() {
  const params = useLocalSearchParams<{
    id: string | string[];
    structuredSection: string | string[];
    recordId?: string | string[];
  }>();
  const patientId = Number(first(params.id));
  const recordId = Number(first(params.recordId));
  const section = first(params.structuredSection);

  if (!Number.isFinite(patientId) || patientId <= 0 || !Number.isFinite(recordId) || recordId <= 0) {
    return (
      <ErrorState
        title="Contexto clínico inválido"
        message="Paciente o expediente inválido para registrar este antecedente."
      />
    );
  }

  if (section === 'conditions') return <ConditionFormScreen patientId={patientId} recordId={recordId} />;
  if (section === 'allergies') return <AllergyFormScreen patientId={patientId} recordId={recordId} />;
  if (section === 'disabilities') return <DisabilityFormScreen patientId={patientId} recordId={recordId} />;
  if (section === 'history') return <MedicalHistoryFormScreen patientId={patientId} recordId={recordId} />;

  return <ErrorState title="Sección inválida" message="La sección clínica solicitada no existe." />;
}
