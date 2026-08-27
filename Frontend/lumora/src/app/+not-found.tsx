import { router } from 'expo-router';

import { FullScreenState } from '@/shared/components/FullScreenState';

export default function NotFoundRoute() {
  return (
    <FullScreenState
      title="Pantalla no encontrada"
      message="La sección que intentaste abrir no existe."
      actionLabel="Ir al inicio"
      onAction={() => router.replace('/')}
    />
  );
}
