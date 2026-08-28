import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { theme } from '@/shared/theme/tokens';

type PrescriptionSummaryCardProps = {
  titulo: string;
  estadoNombre: string;
  doctorNombre: string;
  especialidad: string;
  fechaEmision: string;
  vigenciaHasta: string | null;
  observaciones: string | null;
};

/** Formatea un ISO datetime del backend como "15 Oct 2023". */
function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Encabezado del Detalle de Receta: tratamiento, doctor, fechas e instrucciones. */
export function PrescriptionSummaryCard({
  titulo,
  estadoNombre,
  doctorNombre,
  especialidad,
  fechaEmision,
  vigenciaHasta,
  observaciones,
}: PrescriptionSummaryCardProps) {
  return (
    <View className="gap-4 rounded-2xl border border-lumen-300 bg-bone-300 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-xl font-bold text-coal-900">{titulo}</Text>

        <View className="flex-row items-center gap-1 rounded-full bg-lumen-300 px-3 py-1">
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={theme.colors.textPrimary}
          />
          <Text className="text-xs font-semibold text-coal-900">{estadoNombre}</Text>
        </View>
      </View>

      <Text className="text-sm text-coal-500">
        {doctorNombre} · {especialidad}
      </Text>

      <View className="h-px bg-bone-500" />

      <View className="flex-row gap-6">
        <View className="gap-1">
          <Text className="text-xs font-semibold uppercase text-coal-500">Emisión</Text>
          <Text className="text-sm text-coal-900">{formatShortDate(fechaEmision)}</Text>
        </View>

        {vigenciaHasta ? (
          <View className="gap-1">
            <Text className="text-xs font-semibold uppercase text-coal-500">
              Vencimiento
            </Text>
            <Text className="text-sm text-coal-900">{formatShortDate(vigenciaHasta)}</Text>
          </View>
        ) : null}
      </View>

      {observaciones ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-coal-900">
            Instrucciones Generales
          </Text>
          <View className="rounded-xl bg-bone-500 p-3">
            <Text className="text-sm leading-5 text-coal-500">{observaciones}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
