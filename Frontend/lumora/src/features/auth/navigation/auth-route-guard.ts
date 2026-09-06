import type {
  AuthStatus,
} from '@/features/auth/store/auth-store';

/**
 * Posibles decisiones que puede tomar
 * el guard de navegación privada.
 *
 * - wait:
 *   La sesión todavía se está restaurando.
 *
 * - redirect:
 *   No existe sesión y debemos ir al login.
 *
 * - allow:
 *   El usuario tiene sesión y puede entrar.
 */
export type ProtectedRouteDecision =
  | {
      type: 'wait';
    }
  | {
      type: 'redirect';
      href: '/(auth)/login';
    }
  | {
      type: 'allow';
    };

/**
 * Decide qué debe hacer la navegación privada
 * según el estado de autenticación.
 *
 * Esta función NO conoce:
 * - React
 * - Expo Router
 * - Zustand
 * - NativeWind
 *
 * Solo contiene nuestra regla de negocio.
 *
 * En React web sería parecido a la lógica interna
 * de un <ProtectedRoute /> antes de devolver
 * <Navigate to="/login" />.
 */
export function resolveProtectedRoute(
  status: AuthStatus,
): ProtectedRouteDecision {
  if (status === 'bootstrapping') {
    return {
      type: 'wait',
    };
  }

  if (status === 'unauthenticated') {
    return {
      type: 'redirect',
      href: '/(auth)/login',
    };
  }

  return {
    type: 'allow',
  };
}