import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { canManagePatientData } from '@/features/caregiver-access/utils/caregiver-permissions';
import { IndicatorListItem } from '@/features/health-indicators/components/IndicatorListItem';
import { useIndicatorsCatalog } from '@/features/health-indicators/hooks/useIndicatorsCatalog';
import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

/** "Seleccionar Indicador" -- A08. */
export default function SelectIndicatorRoute() {
  const router = useRouter();
  const { indicators, isLoading, isError, refetch } = useIndicatorsCatalog();
  const { activePatient, role } = useShellContext();
  // A13 -- un cuidador de solo lectura no puede registrar mediciones,
  // asi que el subtitulo no debe invitarlo a hacerlo.
  const canManage =
    role !== 'caregiver' || canManagePatientData(activePatient?.accessLevel ?? null);

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando indicadores"
        message="Estamos trayendo el catálogo de indicadores de salud."
      />
    );
  }

  if (isError) {
    return (
      <FullScreenState
        title="No pudimos cargar los indicadores"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  function handleSelect(indicador: IndicatorWithRange) {
    router.push({
      pathname: '/(app)/health-indicators/[indicadorId]/history',
      params: { indicadorId: indicador.id },
    });
  }

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader
        title="Seleccionar Indicador"
        subtitle={
          canManage
            ? 'Elige un indicador para ver su historial o registrar una nueva medición.'
            : 'Elige un indicador para ver su historial.'
        }
      />

      <View className="gap-6 px-4 py-4">
        {indicators.length === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-6">
            <Text className="text-center text-base text-coal-500">
              Todavía no hay indicadores disponibles.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {indicators.map((indicador) => (
              <IndicatorListItem
                key={indicador.id}
                indicador={indicador}
                onPress={handleSelect}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
