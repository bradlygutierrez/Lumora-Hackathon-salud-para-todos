import type {
  PropsWithChildren,
} from 'react';

import {
  useEffect,
} from 'react';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

import {
  CaregiverRelationsUnavailableError,
  shellContextService,
} from '@/features/shell/api/ShellContextService';

import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

import {
  useCaregiverPatientsSync,
} from '@/features/shell/hooks/useCaregiverPatientsSync';

/**
 * Inicializa el contexto privado de Lumora después
 * de que existe una sesión autenticada.
 *
 * Resuelve el rol del usuario y sus pacientes
 * autorizados para preparar patientContext.
 */
export function ShellBootstrap({
  children,
}: PropsWithChildren) {
  const authStatus = useAuthStore(
    (state) => state.status,
  );

  // A12: revalida periódicamente el acceso del caregiver -- si el
  // paciente activo ya no está autorizado, limpia el contexto y el
  // guard de _layout.tsx redirige a /select-patient.
  useCaregiverPatientsSync();

  useEffect(() => {
    if (
      authStatus !== 'authenticated'
    ) {
      usePatientContextStore
        .getState()
        .clear();

      return;
    }

    let cancelled = false;

    const loadShell = async () => {
      usePatientContextStore
        .getState()
        .beginLoading();

      try {
        const identity =
          await shellContextService
            .loadIdentity();

        if (cancelled) {
          return;
        }

        usePatientContextStore
          .getState()
          .hydrate(
            identity.role,
            identity.availablePatients,
          );
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (
          error instanceof
          CaregiverRelationsUnavailableError
        ) {
          usePatientContextStore
            .getState()
            .setError(
              'El acceso de cuidador todavía no está disponible en el backend.',
            );

          return;
        }

        usePatientContextStore
          .getState()
          .setError(
            'No fue posible preparar el contexto de la aplicación.',
          );
      }
    };

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
  ]);

  return children;
}