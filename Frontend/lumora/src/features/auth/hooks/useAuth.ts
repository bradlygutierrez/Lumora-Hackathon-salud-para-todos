import {
  useMutation,
} from '@tanstack/react-query';

import {
  useRouter,
} from 'expo-router';

type LoginRouter = ReturnType<typeof useRouter>;

import {
  authApi,
} from '@/features/auth/api/auth-api';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

import type {
  LoginResponse,
} from '@/features/auth/types/auth.types';

import type {
  StoredSession,
} from '@/shared/api/secure-session';

/**
 * Dependencias necesarias para procesar
 * una respuesta de login.
 */
type LoginCoordinatorDependencies = {
  router: LoginRouter;

  setSession: (
    session: StoredSession,
  ) => Promise<void>;

  setPendingMfa: ReturnType<
    typeof useAuthStore.getState
  >['setPendingMfa'];
};

/**
 * Coordina qué debe ocurrir después de login.
 *
 * La pantalla no necesita conocer:
 * - SecureStore;
 * - MFA internamente;
 * - rutas finales;
 * - creación de sesión.
 */
class LoginCoordinator {
  constructor(
    private readonly dependencies:
      LoginCoordinatorDependencies,
  ) {}

  /**
   * Procesa la unión discriminada entregada
   * por POST /auth/login.
   */
  public async handle(
    response: LoginResponse,
  ): Promise<void> {
    if (
      response.mfa_required
    ) {
      this.handleMfaRequired(
        response,
      );

      return;
    }

    await this.handleAuthenticated(
      response,
    );
  }

  /**
   * El usuario todavía no está autenticado.
   *
   * Guardamos únicamente el challenge temporal
   * y enviamos a la pantalla MFA.
   */
  private handleMfaRequired(
    response:
      Extract<
        LoginResponse,
        {
          mfa_required: true;
        }
      >,
  ): void {
    this.dependencies
      .setPendingMfa({
        challengeToken:
          response.challenge_token,

        expiresIn:
          response.expires_in,

        method:
          response.method,
      });

    this.dependencies
      .router.push(
        '/(auth)/mfa',
      );
  }

  /**
   * Login sin MFA o MFA ya completado.
   *
   * Persistimos la sesión y entramos
   * al shell privado.
   */
  private async handleAuthenticated(
    response:
      Extract<
        LoginResponse,
        {
          mfa_required: false;
        }
      >,
  ): Promise<void> {
    await this.dependencies
      .setSession({
        accessToken:
          response.access_token,

        refreshToken:
          response.refresh_token,
      });

    this.dependencies
      .router.replace(
        '/(app)/(tabs)',
      );
  }
}

/**
 * Hook público utilizado por LoginRoute.
 *
 * React Query controla:
 * - pending;
 * - error;
 * - success.
 *
 * LoginCoordinator controla:
 * - navegación;
 * - sesión;
 * - MFA.
 */
export function useLogin() {
  const router =
    useRouter();

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );

  const setPendingMfa =
    useAuthStore(
      (state) =>
        state.setPendingMfa,
    );

  const coordinator =
    new LoginCoordinator({
      router,
      setSession,
      setPendingMfa,
    });

  return useMutation({
    mutationFn: ({
      login,
      password,
    }: {
      login: string;
      password: string;
    }) =>
      authApi.login(
        login,
        password,
      ),

    onSuccess:
      (
        response,
      ) =>
        coordinator.handle(
          response,
        ),
  });
}