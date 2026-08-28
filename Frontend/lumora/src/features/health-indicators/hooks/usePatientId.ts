import { useQuery } from '@tanstack/react-query';

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';

/**
 * Resuelve el paciente_id del usuario logueado.
 *
 * Reutiliza `prescriptionsApi.getMyPatientProfile()` (GET /pacientes/me) en
 * vez de duplicar la llamada -- mismo criterio que useTodayMedicationPlan
 * (A07). El comentario original en PrescriptionsApiService.getMyPatientProfile
 * ya avisaba que si otra feature lo volvía a necesitar convenía moverlo a un
 * shared/features de "patients"; por ahora se reutiliza tal cual para no
 * tocar código de A07 ya mergeado.
 *
 * B09 agregará el "patientContext" real (que un cuidador autorizado pueda
 * elegir ENTRE varios pacientes). Hasta entonces, este hook resuelve el
 * paciente propio del usuario logueado, igual que el resto de la app.
 */
export function usePatientId() {
  const query = useQuery({
    queryKey: ['patient-me'],
    queryFn: () => prescriptionsApi.getMyPatientProfile(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    pacienteId: query.data?.id,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
