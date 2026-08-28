import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IndicatorListItem } from '@/features/health-indicators/components/IndicatorListItem';
import { useIndicatorsCatalog } from '@/features/health-indicators/hooks/useIndicatorsCatalog';
import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { theme } from '@/shared/theme/tokens';

/** "Seleccionar Indicador" -- A08. */
export default function SelectIndicatorRoute() {
  const router = useRouter();
  const { indicators, isLoading, isError, refetch } = useIndicatorsCatalog();

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
    <Screen scrollable contentClassName="gap-6">
      <View className="flex-row items-center gap-3">
        {/* El Stack de (app) corre con headerShown: false (ver
            (app)/_layout.tsx), así que esta pantalla arma su propio
            "atrás", igual que Detalle de Receta (A07). */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <Text className="text-2xl font-bold text-coal-900">Seleccionar Indicador</Text>
      </View>

      <Text className="text-base text-coal-500">
        Elige un indicador para ver su historial o registrar una nueva medición.
      </Text>

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
    </Screen>
  );
}
