import { router } from 'expo-router';

import { FullScreenState } from '@/shared/components/FullScreenState';

export default function ForbiddenRoute() {
  return (
    <FullScreenState
      title="Acceso denegado"
      message="Tu cuenta no tiene permisos para acceder a esta sección."
      actionLabel="Volver al inicio"
      onAction={() => router.replace('/')}
    />
  );
}
