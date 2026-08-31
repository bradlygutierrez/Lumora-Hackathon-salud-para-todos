import { create } from 'zustand';

import type {
  LumoraRole,
  PatientContext,
} from '@/features/shell/types/shell.types';

export type ShellStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'needs-patient'
  | 'unsupported-role'
  | 'error';

type PatientContextState = {
  status: ShellStatus;
  role: LumoraRole | null;
  availablePatients: PatientContext[];
  activePatient: PatientContext | null;
  errorMessage: string | null;
  beginLoading: () => void;
  hydrate: (
    role: LumoraRole,
    availablePatients: PatientContext[],
  ) => void;
  selectPatient: (patientId: number) => boolean;
  /**
   * Refresca la lista de pacientes autorizados de un caregiver con datos
   * frescos del backend (A12). Si el paciente activo ya no aparece en la
   * lista -- porque el paciente revocó el acceso, o expiró -- se limpia
   * el contexto y vuelve a "needs-patient" para forzar una nueva
   * selección (el layout ya redirige a /select-patient en ese estado).
   * Si el paciente activo sigue autorizado, no se toca -- solo se
   * refresca la lista para que la pantalla de selección muestre datos
   * al día.
   */
  syncAvailablePatients: (
    role: LumoraRole,
    freshPatients: PatientContext[],
  ) => void;
  clear: () => void;
  setError: (message: string) => void;
};

export const usePatientContextStore =
  create<PatientContextState>((set, get) => ({
    status: 'idle',
    role: null,
    availablePatients: [],
    activePatient: null,
    errorMessage: null,

    beginLoading: () => {
      set({
        status: 'loading',
        errorMessage: null,
      });
    },

    hydrate: (role, availablePatients) => {
      if (role === 'unsupported') {
        set({
          role,
          availablePatients: [],
          activePatient: null,
          status: 'unsupported-role',
          errorMessage: null,
        });

        return;
      }

      if (role === 'patient') {
        set({
          role,
          availablePatients,
          activePatient: availablePatients[0] ?? null,
          status: availablePatients.length === 1 ? 'ready' : 'error',
          errorMessage:
            availablePatients.length === 1
              ? null
              : 'No fue posible resolver tu perfil de paciente.',
        });

        return;
      }

      set({
        role,
        availablePatients,
        activePatient: availablePatients.length === 1
          ? availablePatients[0]
          : null,
        status: availablePatients.length === 1
          ? 'ready'
          : 'needs-patient',
        errorMessage: null,
      });
    },

    selectPatient: (patientId) => {
      const patient = get().availablePatients.find(
        (item) => item.patientId === patientId,
      );

      if (!patient) {
        return false;
      }

      set({
        activePatient: patient,
        status: 'ready',
        errorMessage: null,
      });

      return true;
    },

    syncAvailablePatients: (role, freshPatients) => {
      const current = get();

      // Un cambio de rol (ej. sesión distinta) no se resuelve aquí --
      // eso pasa por hydrate() en el próximo login.
      if (current.role !== role) {
        return;
      }

      const stillAuthorized =
        current.activePatient !== null &&
        freshPatients.some(
          (item) => item.patientId === current.activePatient?.patientId,
        );

      if (current.activePatient !== null && !stillAuthorized) {
        set({
          availablePatients: freshPatients,
          activePatient: null,
          status: 'needs-patient',
          errorMessage:
            'Tu acceso a ese paciente ya no está disponible. Elige otro paciente.',
        });
        return;
      }

      // El paciente activo (si hay uno) sigue autorizado -- solo
      // refrescamos la lista con los datos más recientes (nombres,
      // nivel de acceso, etc.) sin tocar la selección actual.
      const refreshedActivePatient =
        current.activePatient !== null
          ? (freshPatients.find(
              (item) => item.patientId === current.activePatient?.patientId,
            ) ?? current.activePatient)
          : null;

      set({
        availablePatients: freshPatients,
        activePatient: refreshedActivePatient,
      });
    },

    clear: () => {
      set({
        status: 'idle',
        role: null,
        availablePatients: [],
        activePatient: null,
        errorMessage: null,
      });
    },

    setError: (errorMessage) => {
      set({
        status: 'error',
        errorMessage,
        activePatient: null,
      });
    },
  }));
