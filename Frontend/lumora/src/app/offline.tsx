import { router } from 'expo-router';

import { FullScreenState } from '@/shared/components/FullScreenState';

export default function OfflineRoute() {
  return (
    <FullScreenState
      kind="offline"
      title="Sin conexión"
      message="Revisa tu conexión a Internet e intenta nuevamente."
      actionLabel="Reintentar"
      onAction={() => router.replace('/')}
    />
  );
}
