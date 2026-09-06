import { useLocalSearchParams } from 'expo-router';

import { AllergiesScreen } from '@/src/features/medical-records/screens/AllergiesScreen';
import { ConditionsScreen } from '@/src/features/medical-records/screens/ConditionsScreen';
import { DisabilitiesScreen } from '@/src/features/medical-records/screens/DisabilitiesScreen';
import { MedicalHistoryEntriesScreen } from '@/src/features/medical-records/screens/MedicalHistoryEntriesScreen';
import { ErrorState } from '@/src/shared/components/RemoteState';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function StructuredHistoryListRoute() {
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
        message="Paciente o expediente inválido para esta sección clínica."
      />
    );
  }

  if (section === 'conditions') return <ConditionsScreen patientId={patientId} recordId={recordId} />;
  if (section === 'allergies') return <AllergiesScreen patientId={patientId} recordId={recordId} />;
  if (section === 'disabilities') return <DisabilitiesScreen patientId={patientId} recordId={recordId} />;
  if (section === 'history') return <MedicalHistoryEntriesScreen patientId={patientId} recordId={recordId} />;

  return <ErrorState title="Sección inválida" message="La sección clínica solicitada no existe." />;
}
