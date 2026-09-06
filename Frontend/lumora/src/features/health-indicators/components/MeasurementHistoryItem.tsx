import { Text, View } from 'react-native';

import { RangeBadge } from '@/features/health-indicators/components/RangeBadge';
import type { ResolvedHistoryEntry } from '@/features/health-indicators/hooks/useResolvedIndicatorHistory';

/** Formatea un ISO datetime del backend como "26 ago 2026, 08:15". */
function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type MeasurementHistoryItemProps = {
  entry: ResolvedHistoryEntry;
};

/** Fila de "Registros Anteriores" en Historial de Indicador. */
export function MeasurementHistoryItem({ entry }: MeasurementHistoryItemProps) {
  return (
    <View className="gap-2 rounded-2xl border border-bone-500 bg-bone-300 p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-bold text-coal-900">
          {entry.valor} {entry.unidadNombre}
        </Text>
        <RangeBadge evaluacion={entry.evaluacion} />
      </View>

      <Text className="text-sm text-coal-500">
        {formatDateTime(entry.fechaMedicion)} · {entry.origenNombre}
      </Text>

      {entry.observaciones ? (
        <Text className="text-sm text-coal-500">{entry.observaciones}</Text>
      ) : null}
    </View>
  );
}
