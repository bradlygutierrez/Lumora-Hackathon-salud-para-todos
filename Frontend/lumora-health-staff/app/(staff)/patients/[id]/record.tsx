import { useLocalSearchParams } from 'expo-router';

import { MedicalRecordSummaryScreen } from '@/src/features/medical-records/screens/MedicalRecordSummaryScreen';
import type { ClinicalSectionId } from '@/src/features/medical-records/types/medical-record.types';
import { ErrorState } from '@/src/shared/components/RemoteState';

const clinicalSections = new Set<ClinicalSectionId>([
  'condiciones',
  'alergias',
  'discapacidades',
  'historial',
  'consultas',
  'diagnosticos',
  'recetas',
  'indicadores',
  'alertas',
]);

function resolveSection(value: string | string[] | undefined): ClinicalSectionId | undefined {
  const section = Array.isArray(value) ? value[0] : value;
  return section && clinicalSections.has(section as ClinicalSectionId)
    ? (section as ClinicalSectionId)
    : undefined;
}

export default function PatientRecordRoute() {
  const { id, section } = useLocalSearchParams<{
    id: string | string[];
    section?: string | string[];
  }>();
  const patientId = Number(Array.isArray(id) ? id[0] : id);

  if (!Number.isFinite(patientId) || patientId <= 0) {
    return (
      <ErrorState
        title="Paciente inválido"
        message="El identificador del paciente no es válido."
      />
    );
  }

  return (
    <MedicalRecordSummaryScreen
      initialSection={resolveSection(section)}
      patientId={patientId}
    />
  );
}
