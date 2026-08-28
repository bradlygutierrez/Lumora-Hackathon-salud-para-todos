import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { MedicationSection } from '@/features/prescriptions/components/MedicationSection';
import { useCancelDose } from '@/features/prescriptions/hooks/useCancelDose';
import { useRegisterDose } from '@/features/prescriptions/hooks/useRegisterDose';
import { useTodayMedicationPlan } from '@/features/prescriptions/hooks/useTodayMedicationPlan';
import type { TodayMedicationItem } from '@/features/prescriptions/types/prescriptions.types';
import {
  formatPlanDate,
  TIME_OF_DAY_ORDER,
} from '@/features/prescriptions/utils/time-of-day';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

/** "Medicación" / Plan de Hoy — A07. */
export default function MedicationRoute() {
  const { plan, planDate, isLoading, isError, refetch } = useTodayMedicationPlan();
  const registerDose = useRegisterDose();
  const cancelDose = useCancelDose();

  const registeringHorarioId =
    registerDose.isPending && registerDose.variables
      ? registerDose.variables.horarioId
      : null;

  const cancelingHorarioId =
    cancelDose.isPending && cancelDose.variables ? cancelDose.variables.horarioId : null;

  function handleRegisterDose(item: TodayMedicationItem) {
    registerDose.mutate({ horarioId: item.horarioId, hora: item.hora });
  }

  function handleCancelDose(item: TodayMedicationItem) {
    if (!item.dosisHoyId) {
      return;
    }
    cancelDose.mutate({ dosisId: item.dosisHoyId, horarioId: item.horarioId });
  }

  const recetaIdsHoy = new Set(
    TIME_OF_DAY_ORDER.flatMap((bucket) => plan.sections[bucket].map((item) => item.recetaId)),
  );
  const soloRecetaActivaId = recetaIdsHoy.size === 1 ? [...recetaIdsHoy][0] : null;

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando tu plan"
        message="Estamos preparando tu medicación de hoy."
      />
    );
  }

  if (isError) {
    return (
      <FullScreenState
        title="No pudimos cargar tu plan"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader title="Plan de Hoy" subtitle={formatPlanDate(planDate)} />

      <View className="gap-6 px-4 py-4">
        {plan.totalCount > 0 ? (
          <View className="flex-row items-center gap-2 self-start rounded-full bg-lumen-300 px-4 py-2">
            <Text className="text-sm font-semibold text-coal-900">
              {plan.completedCount} de {plan.totalCount} tomas completadas
            </Text>
          </View>
        ) : null}

        {plan.totalCount === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-6">
            <Text className="text-center text-base text-coal-500">
              No tienes medicación activa programada por ahora.
            </Text>
          </View>
        ) : (
          TIME_OF_DAY_ORDER.map((bucket) => (
            <MedicationSection
              key={bucket}
              bucket={bucket}
              items={plan.sections[bucket]}
              registeringHorarioId={registeringHorarioId}
              onRegisterDose={handleRegisterDose}
              cancelingHorarioId={cancelingHorarioId}
              onCancelDose={handleCancelDose}
            />
          ))
        )}

        {/* Con una sola receta activa el enlace es directo; con varias,
            cada tarjeta ya lleva a SU receta (ver MedicationCard), así que
            este botón se omite para no ser ambiguo. */}
        {soloRecetaActivaId ? (
          <Link
            href={{
              pathname: '/(app)/prescriptions/[recetaId]',
              params: { recetaId: soloRecetaActivaId },
            }}
            asChild
          >
            <AppButton title="Ver receta completa" variant="ghost" />
          </Link>
        ) : null}

        {/* Entrada provisional a Indicadores de Salud (A08): la entrada
            "oficial" del Figma es desde "Mi Salud" (B10, todavía sin
            construir), así que mientras esa pantalla no exista se deja este
            acceso acá para que la feature sea alcanzable y se pueda probar.
            Quitar esta línea cuando B10 conecte su propio enlace. */}
        <Link href="/(app)/health-indicators" asChild>
          <AppButton title="Ver mis indicadores de salud" variant="ghost" />
        </Link>
      </View>
    </Screen>
  );
}
