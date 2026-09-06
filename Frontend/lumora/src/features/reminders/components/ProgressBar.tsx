import { Text, View } from 'react-native';

type ProgressBarProps = {
  actual: number;
  objetivo: number;
  unidad: string;
};

/** Barra de progreso de un recordatorio de seguimiento (ej. "Beber Agua"). */
export function ProgressBar({ actual, objetivo, unidad }: ProgressBarProps) {
  const ratio = objetivo > 0 ? Math.min(actual / objetivo, 1) : 0;
  const percentage = Math.round(ratio * 100);
  const completado = objetivo > 0 && actual >= objetivo;

  return (
    <View className="gap-1">
      <Text className="text-sm text-coal-500">
        Objetivo: {objetivo} {unidad} diarios. (Llevas {actual} {unidad})
      </Text>
      <View
        className="h-2 overflow-hidden rounded-full bg-bone-500"
        accessibilityRole="progressbar"
        // BUGFIX: accessibilityValue.now/min/max exige enteros a nivel
        // nativo (iOS) -- el progreso real avanza en cuartos (0.25, 0.5...)
        // y mandar un float ahi tronaba la app con "Loss of precision
        // during arithmetic conversion: (long long) 0.25". El texto de
        // arriba sigue mostrando el numero exacto sin redondear.
        accessibilityValue={{ min: 0, max: Math.round(objetivo), now: Math.round(actual) }}
      >
        <View
          className={`h-2 rounded-full ${completado ? 'bg-mint-500' : 'bg-lumen-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
