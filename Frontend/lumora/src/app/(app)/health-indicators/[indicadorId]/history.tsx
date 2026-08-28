import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MeasurementHistoryItem } from '@/features/health-indicators/components/MeasurementHistoryItem';
import { RangeBadge } from '@/features/health-indicators/components/RangeBadge';
import { TrendSparkline } from '@/features/health-indicators/components/TrendSparkline';
import { useResolvedIndicatorHistory } from '@/features/health-indicators/hooks/useResolvedIndicatorHistory';
import { AppButton } from '@/shared/components/AppButton';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { theme } from '@/shared/theme/tokens';

/** Cuántos "Registros Anteriores" se muestran por página de "Cargar más". */
const PAGE_SIZE = 5;

/** "Historial de Indicador" -- A08. */
export default function IndicatorHistoryRoute() {
  const { indicadorId } = useLocalSearchParams<{ indicadorId: string }>();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const {
    indicador,
    unidadIndicador,
    entries,
    ultimaMedicion,
    tendencia,
    isLoading,
    isError,
    refetch,
  } = useResolvedIndicatorHistory(indicadorId);

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando historial"
        message="Estamos trayendo tus mediciones registradas."
      />
    );
  }

  if (isError || !indicador) {
    return (
      <FullScreenState
        title="No pudimos cargar el historial"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  // "Última medición" se muestra aparte, así que "Registros Anteriores"
  // arranca desde la segunda medición más reciente (ver Figma).
  const registrosAnteriores = entries.slice(1);
  const registrosVisibles = registrosAnteriores.slice(0, visibleCount);
  const hayMasRegistros = visibleCount < registrosAnteriores.length;

  const rango = indicador.rango;
  const rangoTexto =
    rango && rango.valor_minimo !== null && rango.valor_maximo !== null
      ? `${rango.valor_minimo}-${rango.valor_maximo} ${unidadIndicador}`
      : null;

  return (
    <Screen scrollable contentClassName="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <Text className="text-2xl font-bold text-coal-900">
          Historial de {indicador.nombre}
        </Text>
      </View>

      {ultimaMedicion ? (
        <View className="gap-3 rounded-2xl border border-lumen-300 bg-bone-300 p-4">
          <Text className="text-sm font-semibold uppercase text-coal-500">
            Última medición
          </Text>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-3xl font-bold text-coal-900">
              {ultimaMedicion.valor} {ultimaMedicion.unidadNombre}
            </Text>
            <RangeBadge evaluacion={ultimaMedicion.evaluacion} />
          </View>

          {rangoTexto ? (
            <Text className="text-sm text-coal-500">Rango saludable: {rangoTexto}</Text>
          ) : null}
        </View>
      ) : (
        <View className="rounded-2xl border border-bone-500 bg-bone-500 p-6">
          <Text className="text-center text-base text-coal-500">
            Todavía no tienes mediciones de {indicador.nombre}.
          </Text>
        </View>
      )}

      <View className="gap-3">
        <Text className="text-lg font-semibold text-coal-900">
          Tendencia (últimos registros)
        </Text>
        <TrendSparkline points={tendencia} />
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-coal-900">Registros Anteriores</Text>

        {registrosVisibles.length === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
            <Text className="text-sm text-coal-500">
              No hay registros anteriores todavía.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {registrosVisibles.map((entry) => (
              <MeasurementHistoryItem key={entry.id} entry={entry} />
            ))}
          </View>
        )}

        {hayMasRegistros ? (
          <AppButton
            title="Cargar más registros"
            variant="ghost"
            onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
          />
        ) : null}
      </View>

      <AppButton
        title="+ Nueva Medición"
        onPress={() =>
          router.push({
            pathname: '/(app)/health-indicators/[indicadorId]/new',
            params: { indicadorId: indicador.id },
          })
        }
      />
    </Screen>
  );
}
