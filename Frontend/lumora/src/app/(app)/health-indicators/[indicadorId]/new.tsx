import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { MeasurementForm } from '@/features/health-indicators/components/MeasurementForm';
import { useIndicatorsCatalog } from '@/features/health-indicators/hooks/useIndicatorsCatalog';
import { useRegisterMeasurement } from '@/features/health-indicators/hooks/useRegisterMeasurement';
import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';
import { useMeasurementUnitCatalog } from '@/features/prescriptions/hooks/useCatalog';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

/** "Nueva Medición" -- A08. */
export default function NewMeasurementRoute() {
  const { indicadorId } = useLocalSearchParams<{ indicadorId: string }>();
  const router = useRouter();

  const { getById, isLoading: isCatalogLoading, isError: isCatalogError, refetch } =
    useIndicatorsCatalog();
  const unitsCatalog = useMeasurementUnitCatalog();
  const registerMeasurement = useRegisterMeasurement();

  const isLoading = isCatalogLoading || unitsCatalog.isLoading;
  const isError = isCatalogError || unitsCatalog.isError;

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando indicador"
        message="Estamos preparando el formulario de medición."
      />
    );
  }

  const indicadorEncontrado = getById(indicadorId);

  if (isError || !indicadorEncontrado) {
    return (
      <FullScreenState
        title="No pudimos cargar el indicador"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  // TS no propaga el narrowing de `indicadorEncontrado` (posiblemente
  // undefined) dentro de las funciones declaradas más abajo -- se guarda en
  // una constante ya tipada como `IndicatorWithRange` para no repetir "!" en
  // cada uso.
  const indicador: IndicatorWithRange = indicadorEncontrado;

  function handleCancel() {
    router.back();
  }

  function handleSubmit(values: {
    valor: number;
    origen: 'Manual' | 'Dispositivo';
    observaciones: string | null;
  }) {
    registerMeasurement.mutate(
      {
        indicadorId: indicador.id,
        valor: values.valor,
        unidadMedidaId: indicador.unidad_medida_id,
        origen: values.origen,
        observaciones: values.observaciones,
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  return (
    <Screen scrollable keyboardAvoiding contentClassName="px-0 py-0">
      <AppHeader title="Nueva Medición" />

      <View className="gap-6 px-4 py-4">
        {registerMeasurement.isError ? (
          <View className="rounded-2xl border border-warm-500 bg-warm-300 p-4">
            <Text className="text-sm font-medium text-coal-900">
              No pudimos guardar la medición. Revisa tu conexión e intenta de nuevo.
            </Text>
          </View>
        ) : null}

        <MeasurementForm
          indicador={indicador}
          unidadNombre={unitsCatalog.nameById(indicador.unidad_medida_id)}
          isSubmitting={registerMeasurement.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </View>
    </Screen>
  );
}
