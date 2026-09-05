import { Text, View } from 'react-native';

import { canManagePatientData } from '@/features/caregiver-access/utils/caregiver-permissions';
import { HealthAlertCard } from '@/features/health-alerts/components/HealthAlertCard';
import { useHealthAlerts } from '@/features/health-alerts/hooks/useHealthAlerts';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

/** "Alertas de Salud" -- A09. */
export default function HealthAlertsRoute() {
  const { alerts, isLoading, isError, refetch } = useHealthAlerts();
  const { activePatient, role } = useShellContext();
  // A13 -- un cuidador de solo lectura no debe ver "Registrar Ahora" en
  // una alerta de dosis omitida.
  const canManage =
    role !== 'caregiver' || canManagePatientData(activePatient?.accessLevel ?? null);

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando tus alertas"
        message="Estamos revisando tus alertas de salud."
      />
    );
  }

  if (isError) {
    return (
      <FullScreenState
        title="No pudimos cargar tus alertas"
        message="Revisa tu conexion e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  return (
    <Screen scrollable contentClassName="px-0 py-0" tint="health">
      <AppHeader
        title="Alertas de Salud"
        subtitle="Alertas clinicas, dosis pendientes y citas proximas de los ultimos dos dias."
      />

      <View className="gap-3 px-4 py-4">
        {alerts.length === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-6">
            <Text className="text-center text-base text-coal-500">
              No tienes alertas de salud por ahora.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <HealthAlertCard key={alert.id} alert={alert} canManage={canManage} />
          ))
        )}
      </View>
    </Screen>
  );
}
