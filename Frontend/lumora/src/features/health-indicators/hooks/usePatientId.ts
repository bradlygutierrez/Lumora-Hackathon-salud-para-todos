import { useShellContext } from '@/features/shell/hooks/useShellContext';

/**
 * Resuelve el patientId activo (patientContext) para Indicadores de Salud.
 *
 * Antes de que existiera el patientContext real (B09, mergeado en
 * `develop` después de que empezamos A08), este hook llamaba a
 * GET /pacientes/me directamente -- pero eso solo funciona para el rol
 * "Paciente" y no soporta cuidadores, que es justo uno de los dos roles
 * que pide el ticket ("Roles: Paciente + Cuidador autorizado").
 *
 * Ahora reutiliza el patientContext del shell (useShellContext /
 * usePatientContextStore), que ya resuelve el paciente correcto para
 * AMBOS roles y respeta el paciente que el cuidador haya seleccionado en
 * "/select-patient". El route guard de (app)/_layout.tsx ya redirige a
 * "/select-patient" antes de que estas pantallas puedan montarse sin un
 * patientContext activo, así que en el uso normal `activePatient` siempre
 * está resuelto acá.
 */
export function usePatientId() {
  const { status, activePatient } = useShellContext();

  return {
    pacienteId: activePatient?.patientId,
    isLoading: status === 'idle' || status === 'loading',
    isError: status === 'error',
  };
}
