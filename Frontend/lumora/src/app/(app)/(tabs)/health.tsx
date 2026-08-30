import {
  useState,
} from 'react';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
  ClinicalAlertCard,
} from '@/features/home-health/components/ClinicalAlertCard';

import {
  HealthMetricTile,
} from '@/features/home-health/components/HealthMetricTile';

import {
  HomeHealthState,
} from '@/features/home-health/components/HomeHealthState';

import {
  NextAppointmentCard,
} from '@/features/home-health/components/NextAppointmentCard';

import {
  useHomeHealthDashboard,
} from '@/features/home-health/hooks/useHomeHealthDashboard';

import {
  homeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

import type {
  ActiveConditionSummary,
  HomeHealthDashboardData,
} from '@/features/home-health/types/home-health.types';

import {
  AppHeader,
} from '@/shared/components/AppHeader';

import {
  Screen,
} from '@/shared/components/Screen';

import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';
import { presentApiError, toApiError } from '@/shared/api/api-error';
import { RemoteState } from '@/shared/components/RemoteState';

type HealthSection = 'summary' | 'conditions';

/**
 * B10 — Mi Salud.
 *
 * El tab Indicadores navega a A08, mientras Resumen/Condiciones utilizan
 * el nuevo endpoint patient-facing de B10 y el patientContext de B09.
 */
export default function HealthRoute() {
  const {
    role,
    activePatient,
  } = useShellContext();

  const [section, setSection] = useState<HealthSection>('summary');

  const dashboard = useHomeHealthDashboard(
    activePatient?.patientId ?? null,
  );

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      {role !== 'caregiver' ? (
        <AppHeader
          title="Mi Salud"
          subtitle="Tu resumen de bienestar y registro personal."
          showBackButton={false}
          showNotification
        />
      ) : null}

      <View className="gap-4 px-4 py-4">
        <View className="flex-row gap-2">
          <TabPill
            label="Resumen"
            active={section === 'summary'}
            role="tab"
            onPress={() => setSection('summary')}
          />

          <TabPill
            label="Indicadores"
            role="button"
            onPress={() => router.push('/(app)/health-indicators')}
          />

          <TabPill
            label="Condiciones"
            active={section === 'conditions'}
            role="tab"
            onPress={() => setSection('conditions')}
          />
        </View>

        {!activePatient ? (
          <HomeHealthState
            kind="empty"
            title="Sin paciente activo"
            message="Selecciona un paciente para consultar información de salud."
          />
        ) : dashboard.isLoading ? (
          <HomeHealthState
            kind="loading"
            title="Cargando Mi Salud"
            message="Estamos consultando tus indicadores y antecedentes activos."
          />
        ) : dashboard.isError || !dashboard.data ? (
          <HealthErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        ) : section === 'conditions' ? (
          <ConditionsSection
            conditions={dashboard.data.healthSummary.active_conditions}
          />
        ) : (
          <SummarySection data={dashboard.data} />
        )}
      </View>
    </Screen>
  );
}

function HealthErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const presentation = presentApiError(error);
  const canRetry = toApiError(error).isRetryable();

  return (
    <RemoteState
      kind={presentation.kind}
      title={presentation.title}
      message={presentation.message}
      actionLabel={canRetry ? 'Reintentar' : undefined}
      onAction={canRetry ? onRetry : undefined}
    />
  );
}

function SummarySection({
  data,
}: {
  data: HomeHealthDashboardData;
}) {
  const allergy = homeHealthPresenter.primaryAllergy(
    data.healthSummary.allergies,
  );
  const metrics = homeHealthPresenter.latestMetrics(
    data.measurements,
    data.indicators,
    data.measurementUnits,
    data.alerts,
    4,
  );
  const nextAppointment = homeHealthPresenter.nextAppointment(data.appointments);
  const alerts = homeHealthPresenter.pendingAlerts(data.alerts);

  return (
    <View className="gap-4">
      {allergy ? (
        <ClinicalAlertCard
          title="Alergia registrada"
          badge={allergy.severity}
          message={
            allergy.description ??
            `Tienes una alergia activa registrada a ${allergy.name}. Mantén esta información visible para cualquier profesional de salud.`
          }
        />
      ) : null}

      {alerts.map((alert) => (
        <ClinicalAlertCard
          key={alert.id}
          title="Indicador fuera de rango"
          message={alert.mensaje}
        />
      ))}

      {alerts.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver todas las alertas de salud"
          onPress={() => router.push('/(app)/health-alerts')}
          className="min-h-12 justify-center"
        >
          <Text className="text-center text-sm font-semibold text-[#4A86B6]">
            Ver todas las alertas de salud
          </Text>
        </Pressable>
      ) : null}

      <SurfaceCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-coal-900">Indicadores clave</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar indicador"
            onPress={() => router.push('/(app)/health-indicators')}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#E7F2F7]"
          >
            <Ionicons name="add" size={18} color="#4A86B6" />
          </Pressable>
        </View>

        {metrics.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap gap-3">
            {metrics.slice(0, 2).map((metric) => (
              <View key={metric.indicatorId} className="w-[47%]">
                <HealthMetricTile
                  metric={metric}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/health-indicators/[indicadorId]/history',
                      params: { indicadorId: metric.indicatorId },
                    })
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-4 text-sm text-coal-500">
            Todavía no tienes mediciones registradas.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver histórico completo"
          onPress={() => router.push('/(app)/health-indicators')}
          className="mt-5 min-h-12 justify-center"
        >
          <Text className="text-center text-sm font-semibold text-[#4A86B6]">
            Ver histórico completo
          </Text>
        </Pressable>
      </SurfaceCard>

      <ConditionsSection conditions={data.healthSummary.active_conditions} />

      {nextAppointment ? (
        <NextAppointmentCard
          emphasis
          appointment={nextAppointment}
          appointmentTypes={data.appointmentTypes}
          onPress={() => router.push('/(app)/(tabs)/appointments')}
        />
      ) : null}
    </View>
  );
}

function ConditionsSection({
  conditions,
}: {
  conditions: ActiveConditionSummary[];
}) {
  const activeConditions = homeHealthPresenter.activeConditions(conditions);

  return (
    <SurfaceCard>
      <View className="flex-row items-center gap-2">
        <Ionicons name="bandage-outline" size={18} color="#4A86B6" />
        <Text className="text-lg font-bold text-coal-900">Condiciones activas</Text>
      </View>

      {activeConditions.length === 0 ? (
        <Text className="mt-4 text-sm text-coal-500">
          No hay condiciones médicas activas registradas.
        </Text>
      ) : (
        <View className="mt-4 gap-3">
          {activeConditions.map((condition) => {
            const year = homeHealthPresenter.conditionDate(condition);

            return (
              <View
                key={condition.id}
                className="rounded-2xl border border-coal-500/10 bg-[#F7F8F8] p-4"
              >
                <Text className="text-sm font-bold text-coal-900">
                  {condition.name}
                </Text>

                {condition.description ? (
                  <Text className="mt-1 text-xs leading-4 text-coal-500">
                    {condition.description}
                  </Text>
                ) : null}

                <View className="mt-2 flex-row flex-wrap gap-2">
                  {year ? (
                    <Text className="text-[10px] text-coal-500">
                      Diagnosticado: {year}
                    </Text>
                  ) : null}

                  {condition.status ? (
                    <Text className="text-[10px] font-semibold text-[#4A86B6]">
                      {condition.status}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </SurfaceCard>
  );
}

function TabPill({
  label,
  active = false,
  role,
  onPress,
}: {
  label: string;
  active?: boolean;
  role: 'tab' | 'button';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'tab' ? { selected: active } : undefined}
      onPress={onPress}
      className={`min-h-12 justify-center rounded-full px-4 py-2 active:opacity-80 ${
        active ? 'bg-[#7CADDC]' : 'bg-[#EEF3F6]'
      }`}
    >
      <Text
        className={`text-xs ${
          active ? 'font-semibold text-white' : 'font-medium text-coal-500'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
