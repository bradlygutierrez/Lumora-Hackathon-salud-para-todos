import { create } from 'zustand';

import type {
  LumoraRole,
  PatientContext,
  SelectableLumoraRole,
} from '@/features/shell/types/shell.types';

export type ShellStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'needs-role'
  | 'needs-patient'
  | 'unsupported-role'
  | 'error';

type PatientContextState = {
  status: ShellStatus;
  role: LumoraRole | null;
  availablePatients: PatientContext[];
  activePatient: PatientContext | null;
  errorMessage: string | null;
  currentUserId: number | null;

  beginLoading: () => void;
  hydrate: (
    role: LumoraRole,
    availablePatients: PatientContext[],
    currentUserId: number,
  ) => void;
  activateRole: (
    role: SelectableLumoraRole,
    availablePatients: PatientContext[],
  ) => void;
  selectPatient: (patientId: number) => boolean;
  syncAvailablePatients: (
    role: LumoraRole,
    freshPatients: PatientContext[],
  ) => void;
  clear: () => void;
  setError: (message: string) => void;
};

function roleState(
  role: SelectableLumoraRole,
  availablePatients: PatientContext[],
) {
  if (role === 'patient') {
    return {
      role,
      availablePatients,
      activePatient: availablePatients[0] ?? null,
      status:
        availablePatients.length === 1
          ? 'ready' as const
          : 'error' as const,
      errorMessage:
        availablePatients.length === 1
          ? null
          : 'No fue posible resolver tu perfil de paciente.',
    };
  }

  return {
    role,
    availablePatients,
    activePatient:
      availablePatients.length === 1
        ? availablePatients[0]
        : null,
    status:
      availablePatients.length === 1
        ? 'ready' as const
        : 'needs-patient' as const,
    errorMessage: null,
  };
}

export const usePatientContextStore =
  create<PatientContextState>((set, get) => ({
    status: 'idle',
    role: null,
    availablePatients: [],
    activePatient: null,
    errorMessage: null,
    currentUserId: null,

    beginLoading: () => {
      set({
        status: 'loading',
        errorMessage: null,
      });
    },

    hydrate: (role, availablePatients, currentUserId) => {
      if (role === 'unsupported') {
        set({
          role,
          availablePatients: [],
          activePatient: null,
          status: 'unsupported-role',
          errorMessage: null,
          currentUserId,
        });
        return;
      }

      if (role === 'dual') {
        set({
          role,
          availablePatients: [],
          activePatient: null,
          status: 'needs-role',
          errorMessage: null,
          currentUserId,
        });
        return;
      }

      set({
        ...roleState(role, availablePatients),
        currentUserId,
      });
    },

    activateRole: (role, availablePatients) => {
      set({
        ...roleState(role, availablePatients),
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

      if (
        role !== 'caregiver' ||
        current.role !== 'caregiver'
      ) {
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
        currentUserId: null,
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
