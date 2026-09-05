import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PrescriptionMedicationItem } from '@/features/prescriptions/components/PrescriptionMedicationItem';
import { PrescriptionSummaryCard } from '@/features/prescriptions/components/PrescriptionSummaryCard';
import { usePrescriptionDetail } from '@/features/prescriptions/hooks/usePrescriptionDetail';
import { useSharePrescriptionPdf } from '@/features/prescriptions/hooks/usePrescriptionPdf';
import { PrescriptionPdfUnavailableError } from '@/features/prescriptions/utils/prescription-pdf';
import { AppButton } from '@/shared/components/AppButton';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';
import { theme } from '@/shared/theme/tokens';

/** "Detalle de Receta" — A07. */
export default function PrescriptionDetailRoute() {
  const { recetaId } = useLocalSearchParams<{ recetaId: string }>();
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const sharePdf = useSharePrescriptionPdf();

  const { receta, detalles, doctorNombre, especialidad, estadoNombre, isLoading, isError, refetch } =
    usePrescriptionDetail(recetaId);

  const handleSharePdf = () => {
    sharePdf.mutate(recetaId, {
      onError: (err) =>
        showFeedback(
          err instanceof PrescriptionPdfUnavailableError
            ? err.message
            : 'No pudimos abrir la receta. Intenta de nuevo.',
          'error',
        ),
    });
  };

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando receta"
        message="Estamos trayendo el detalle de tu tratamiento."
      />
    );
  }

  if (isError || !receta) {
    return (
      <FullScreenState
        title="No pudimos cargar la receta"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  return (
    <Screen scrollable contentClassName="gap-6" tint="medication">
      <View className="flex-row items-center gap-3">
        {/* El Stack de (app) corre con headerShown: false (ver
            (app)/_layout.tsx), así que cada pantalla no-tab arma su
            propio "atrás" -- router.back() en vez de navegar a una ruta
            fija, porque a esta pantalla se puede llegar tanto desde
            "Plan de Hoy" como desde el botón "Ver receta completa". */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <Text className="text-2xl font-bold text-coal-900">Detalle de Receta</Text>
      </View>

      <PrescriptionSummaryCard
        titulo={receta.titulo ?? 'Tratamiento'}
        estadoNombre={estadoNombre}
        doctorNombre={doctorNombre}
        especialidad={especialidad}
        fechaEmision={receta.fecha_emision}
        vigenciaHasta={receta.vigencia_hasta}
        observaciones={receta.observaciones}
      />

      <View className="gap-3">
        <Text className="text-lg font-semibold text-coal-900">
          Medicamentos Recetados
        </Text>

        {detalles.length === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
            <Text className="text-sm text-coal-500">
              Esta receta todavía no tiene medicamentos registrados.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {detalles.map((detalle) => (
              <PrescriptionMedicationItem key={detalle.id} detalle={detalle} />
            ))}
          </View>
        )}
      </View>

      <View className="gap-3">
        <AppButton
          title="Ver horario de medicación"
          onPress={() =>
            router.push({
              pathname: '/(app)/(tabs)/medication',
              params: { recetaId },
            })
          }
        />

        <AppButton
          title={sharePdf.isPending ? 'Preparando PDF…' : 'Descargar PDF'}
          variant="ghost"
          onPress={handleSharePdf}
          loading={sharePdf.isPending}
        />
      </View>
    </Screen>
  );
}
