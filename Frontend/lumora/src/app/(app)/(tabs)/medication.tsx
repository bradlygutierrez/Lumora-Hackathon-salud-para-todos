import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';

import { canManagePatientData } from '@/features/caregiver-access/utils/caregiver-permissions';
import { MedicationSection } from '@/features/prescriptions/components/MedicationSection';
import { useCancelDose } from '@/features/prescriptions/hooks/useCancelDose';
import { useRegisterDose } from '@/features/prescriptions/hooks/useRegisterDose';
import { useTodayMedicationPlan } from '@/features/prescriptions/hooks/useTodayMedicationPlan';
import type { TodayMedicationItem } from '@/features/prescriptions/types/prescriptions.types';
import {
  formatPlanDate,
  TIME_OF_DAY_ORDER,
} from '@/features/prescriptions/utils/time-of-day';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

/** "Medicación" / Plan de Hoy — A07. */
export default function MedicationRoute() {
  const { activePrescriptions, plan, planDate, isLoading, isError, refetch } =
    useTodayMedicationPlan();
  const { activePatient, role } = useShellContext();
  const canManage =
    role !== 'caregiver' || canManagePatientData(activePatient?.accessLevel ?? null);
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
      <AppHeader
        title="Plan de Hoy"
        subtitle={formatPlanDate(planDate)}
        rightIcon="time-outline"
        rightIconLabel="Ver recordatorios"
        onRightIconPress={() => router.push('/(app)/reminders')}
      />

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
              canManage={canManage}
            />
          ))
        )}

        {activePrescriptions.length > 0 ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-coal-900">Recetas activas</Text>
            {activePrescriptions.map((receta) => (
              <Link
                key={receta.id}
                href={{
                  pathname: '/(app)/prescriptions/[recetaId]',
                  params: { recetaId: receta.id },
                }}
                asChild
              >
                <AppButton
                  title={receta.titulo ?? 'Ver receta médica'}
                  variant="ghost"
                />
              </Link>
            ))}
          </View>
        ) : null}

        {/* El acceso a Alertas de Salud (A09) ya vive en el tab "Mi
            Salud" (ver app/(app)/(tabs)/health.tsx) -- el acceso
            provisional que estaba aquí se quitó para no duplicarlo. */}

        {/* A10: acceso a "Recordatorios" ahora vive como ícono de
            reloj en la esquina superior derecha del header (junto a
            "Plan de Hoy"), para no competir con "Ver receta completa"
            como acción principal de esta pantalla. */}
      </View>
    </Screen>
  );
}
