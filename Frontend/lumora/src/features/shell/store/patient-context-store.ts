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
