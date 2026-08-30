import type { ClinicalSectionId } from '../types/medical-record.types';

const segmentBySection: Partial<Record<ClinicalSectionId, string>> = {
  condiciones: 'conditions',
  alergias: 'allergies',
  discapacidades: 'disabilities',
  historial: 'history',
};

export function structuredHistoryPathForSection(
  patientId: number,
  recordId: number,
  section: ClinicalSectionId,
) {
  if (section === 'recetas') {
    return `/(staff)/patients/${patientId}/prescriptions?recordId=${recordId}`;
  }
  const segment = segmentBySection[section];
  if (!segment) return null;
  return `/(staff)/patients/${patientId}/record/${segment}?recordId=${recordId}`;
}

export function structuredHistoryPathForTimelineEvent(
  patientId: number,
  recordId: number,
  eventType: string,
) {
  if (eventType === 'condicion' || eventType === 'historial_condicion') {
    return `/(staff)/patients/${patientId}/record/conditions?recordId=${recordId}`;
  }
  if (eventType === 'antecedente') {
    return `/(staff)/patients/${patientId}/record/history?recordId=${recordId}`;
  }
  if (eventType === 'receta') {
    return `/(staff)/patients/${patientId}/prescriptions?recordId=${recordId}`;
  }
  return null;
}