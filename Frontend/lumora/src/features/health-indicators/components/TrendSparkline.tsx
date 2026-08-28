import { Dimensions, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import type { TrendPoint } from '@/features/health-indicators/hooks/useResolvedIndicatorHistory';
import { palette, theme } from '@/shared/theme/tokens';

type TrendSparklineProps = {
  points: TrendPoint[];
};

/** Formatea un ISO datetime como "26 ago" para el eje X de la gráfica. */
function formatShortDay(iso: string): string {
  return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short' }).format(
    new Date(iso),
  );
}

/**
 * Mini gráfica de línea con los últimos registros de un indicador --
 * "Tendencia (últimos 7 días)" en el Figma.
 *
 * `points` viene en orden cronológico (más antiguo primero, ver
 * useIndicatorHistory.tendencia).
 */
export function TrendSparkline({ points }: TrendSparklineProps) {
  if (points.length < 2) {
    return (
      <View className="items-center justify-center rounded-2xl border border-bone-500 bg-bone-300 p-6">
        <Text className="text-center text-sm text-coal-500">
          Necesitas al menos 2 mediciones para ver la tendencia.
        </Text>
      </View>
    );
  }

  // Ancho de pantalla menos el padding horizontal de Screen (px-4 = 16 a cada lado).
  const chartWidth = Dimensions.get('window').width - 32;

  return (
    <LineChart
      data={{
        labels: points.map((point) => formatShortDay(point.fechaMedicion)),
        datasets: [{ data: points.map((point) => point.valor) }],
      }}
      width={chartWidth}
      height={180}
      bezier
      withInnerLines={false}
      withOuterLines={false}
      chartConfig={{
        backgroundGradientFrom: palette.bone.medium,
        backgroundGradientTo: palette.bone.medium,
        decimalPlaces: 1,
        color: () => palette.lumen.strong,
        labelColor: () => palette.coal.light,
        propsForDots: {
          r: '4',
          strokeWidth: '2',
          stroke: palette.lumen.strong,
        },
      }}
      style={{ borderRadius: theme.radius.lg }}
    />
  );
}
