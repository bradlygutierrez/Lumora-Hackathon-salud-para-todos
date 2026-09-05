import { router } from 'expo-router';

import { useAuthStore } from '@/features/auth/store/auth-store';
import { FullScreenState } from '@/shared/components/FullScreenState';

export default function ForbiddenRoute() {
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <FullScreenState
      kind="forbidden"
      title="Acceso denegado"
      message="Tu cuenta no tiene permisos para acceder a esta sección."
      actionLabel="Cerrar sesión"
      onAction={() => {
        // Esta pantalla solo se alcanza cuando el rol de la cuenta es
        // "unsupported" (ProtectedAppLayout redirige acá si
        // shellStatus === 'unsupported-role') -- esa cuenta nunca va a
        // tener una zona válida dentro de Lumora, así que "volver al
        // inicio" (router.replace('/')) la mandaba de vuelta a "/", que
        // por seguir autenticada la reenviaba a (app)/(tabs), que la
        // volvía a rebotar acá: un loop de navegación que parecía que el
        // botón "no hacía nada". Cerrar sesión es la única salida real.
        void clearSession().then(() => router.replace('/(auth)/login'));
      }}
    />
  );
}
