import { useQuery } from '@tanstack/react-query';

import { medicalRecordApi } from '@/features/medical-record/api/medical-record-api';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

/** Query key base compartida con cualquier invalidacion manual futura. */
export const MEDICAL_RECORD_QUERY_KEY = 'medical-record';

/**
 * GET .../patients/{paciente_id}/medical-record para el paciente activo
 * (patientContext del shell, igual que Alertas de Salud -- ver
 * features/health-alerts/hooks/useHealthAlerts.ts). Sirve tanto para
 * Paciente como para Cuidador autorizado: el backend ya valida el acceso
 * con PatientAccessService (ver Backend/.../api/v1/patient_documents.py).
 *
 * La query key incluye pacienteId y NO se usa keepPreviousData/
 * placeholderData -- al cambiar de paciente (A12/A14) siempre se muestra
 * un loading fresco en vez de arrastrar datos del paciente anterior, que
 * es el requisito de aislamiento de cache entre pacientes.
 */
export function useMedicalRecordDocument() {
  const { status, activePatient } = useShellContext();
  const pacienteId = activePatient?.patientId;

  const query = useQuery({
    queryKey: [MEDICAL_RECORD_QUERY_KEY, pacienteId],
    queryFn: () => medicalRecordApi.getDocument(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const isPatientLoading = status === 'idle' || status === 'loading';

  return {
    document: query.data,
    isLoading: isPatientLoading || query.isLoading,
    isError: status === 'error' || query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
