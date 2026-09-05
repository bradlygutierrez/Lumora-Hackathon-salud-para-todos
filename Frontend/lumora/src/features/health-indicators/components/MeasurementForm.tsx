import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';
import {
  MAX_MEASUREMENT_VALUE_LENGTH,
  measurementFormSchema,
  type MeasurementFormValues,
} from '@/features/health-indicators/utils/measurement-form-schema';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { theme } from '@/shared/theme/tokens';

type MeasurementFormSubmitValues = {
  valor: number;
  origen: 'Manual' | 'Dispositivo';
  observaciones: string | null;
};

type MeasurementFormProps = {
  indicador: IndicatorWithRange;
  unidadNombre: string;
  isSubmitting: boolean;
  onSubmit: (values: MeasurementFormSubmitValues) => void;
  onCancel: () => void;
};

/** "90-120 mmHg" / "Mínimo 95 %" / "Máximo 37.2 °C", según qué límites tenga el rango. */
function formatRango(
  indicador: IndicatorWithRange,
  unidadNombre: string,
): string | null {
  const { rango } = indicador;

  if (!rango || (rango.valor_minimo === null && rango.valor_maximo === null)) {
    return null;
  }
  if (rango.valor_minimo !== null && rango.valor_maximo !== null) {
    return `${rango.valor_minimo}-${rango.valor_maximo} ${unidadNombre}`;
  }
  if (rango.valor_minimo !== null) {
    return `Mínimo ${rango.valor_minimo} ${unidadNombre}`;
  }
  return `Máximo ${rango.valor_maximo} ${unidadNombre}`;
}

/**
 * Formulario dinámico de "Nueva Medición".
 *
 * El mismo componente sirve para CUALQUIER indicador del catálogo (los 5
 * iniciales y los que agregue el backend después): el label del valor, el
 * rango de referencia y la unidad salen todos de `indicador`/`unidadNombre`,
 * nada está hardcodeado por tipo de indicador.
 *
 * La "Fecha y Hora" del Figma es editable ahí, pero el backend todavía
 * siempre usa la fecha del servidor (no acepta una fecha custom del
 * cliente -- ver MedicionIndicadorCreate en
 * Backend/.../schemas/health_indicators.py), así que acá se muestra como
 * texto informativo, no como campo editable.
 */
export function MeasurementForm({
  indicador,
  unidadNombre,
  isSubmitting,
  onSubmit,
  onCancel,
}: MeasurementFormProps) {
  const { control, handleSubmit, watch, setValue } = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: { valor: '', origen: 'Manual', observaciones: '' },
  });

  const origen = watch('origen');
  const rangoTexto = formatRango(indicador, unidadNombre);

  function submit(values: MeasurementFormValues) {
    onSubmit({
      valor: Number(values.valor),
      origen: values.origen,
      observaciones: values.observaciones?.trim()
        ? values.observaciones.trim()
        : null,
    });
  }

  return (
    <View className="gap-5">
      <View className="gap-2 rounded-2xl border border-lumen-300 bg-bone-300 p-4">
        <Text className="text-lg font-bold text-coal-900">{indicador.nombre}</Text>
        {rangoTexto ? (
          <Text className="text-sm text-coal-500">
            Rango de referencia: {rangoTexto}
          </Text>
        ) : null}
      </View>

      <FormTextField
        control={control}
        name="valor"
        label={`Valor (${unidadNombre})`}
        placeholder="0"
        keyboardType="decimal-pad"
        maxLength={MAX_MEASUREMENT_VALUE_LENGTH}
      />

      <View className="gap-1">
        <Text className="text-sm font-medium text-coal-900">
          Origen de la medición
        </Text>
        <View className="flex-row gap-2">
          {(['Manual', 'Dispositivo'] as const).map((opcion) => (
            <Pressable
              key={opcion}
              onPress={() => setValue('origen', opcion)}
              accessibilityRole="button"
              accessibilityState={{ selected: origen === opcion }}
              className={`flex-1 items-center rounded-xl border px-4 py-3 ${
                origen === opcion
                  ? 'border-lumen-500 bg-lumen-300'
                  : 'border-bone-500 bg-bone-300'
              }`}
            >
              <Text className="text-sm font-semibold text-coal-900">{opcion}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
        <Text className="text-sm text-coal-500">
          Fecha y hora:{' '}
          {new Intl.DateTimeFormat('es-NI', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date())}
        </Text>
      </View>

      <FormTextField
        control={control}
        name="observaciones"
        label="Observaciones (opcional)"
        placeholder="Ej. después de caminar, en ayunas..."
        multiline
      />

      <View className="gap-3">
        <AppButton
          title={isSubmitting ? 'Guardando…' : 'Guardar Medición'}
          onPress={handleSubmit(submit)}
          loading={isSubmitting}
        />
        <AppButton
          title="Cancelar"
          variant="ghost"
          onPress={onCancel}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );
}
