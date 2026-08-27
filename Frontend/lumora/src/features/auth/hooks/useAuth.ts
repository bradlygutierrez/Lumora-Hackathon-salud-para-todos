import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { authApi } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/store/auth-store';

/**
 * Orquesta el login B08 sin poner lógica de sesión dentro de la pantalla.
 *
 * La pantalla solo entrega credenciales. Este hook interpreta la unión
 * discriminada `mfa_required` y decide si crear sesión o abrir MFA.
 */
export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const setPendingMfa = useAuthStore((state) => state.setPendingMfa);

  return useMutation({
    mutationFn: ({ login, password }: { login: string; password: string }) =>
      authApi.login(login, password),

    onSuccess: async (response) => {
      if (response.mfa_required) {
        /**
         * No existen tokens finales todavía. Guardamos el challenge solo en
         * memoria y lo consumimos en POST /auth/mfa/verify.
         */
        setPendingMfa({
          challengeToken: response.challenge_token,
          expiresIn: response.expires_in,
        });

        router.push('/(auth)/mfa');
        return;
      }

      await setSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });

      router.replace('/(app)/(tabs)');
    },
  });
}
