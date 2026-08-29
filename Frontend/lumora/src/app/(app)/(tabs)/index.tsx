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
  NextDoseCard,
} from '@/features/home-health/components/NextDoseCard';

import {
  useHomeHealthDashboard,
} from '@/features/home-health/hooks/useHomeHealthDashboard';

import type {
  AllergySummary,
  AppointmentResponse,
  HealthMetric,
  HomeHealthDashboardData,
} from '@/features/home-health/types/home-health.types';

import type {
  AlertaClinicaResponse,
} from '@/features/health-indicators/types/health-indicators.types';

import {
  homeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

import {
  AppHeader,
} from '@/shared/components/AppHeader';

import {
  Screen,
} from '@/shared/components/Screen';

import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

/**
 * B10 — Inicio.
 *
 * Paciente y Cuidador comparten la misma query patient-scoped pero tienen
 * jerarquías visuales diferentes según el Figma aprobado.
 */
export default function HomeRoute() {
  const {
    role,
    activePatient,
  } = useShellContext();

  const dashboard = useHomeHealthDashboard(
    activePatient?.patientId ?? null,
  );

  const patientName = activePatient?.displayName ?? 'Paciente';

  if (!activePatient) {
    return (
      <Screen contentClassName="px-0 py-0">
        {role !== 'caregiver' ? (
          <AppHeader
            showBackButton={false}
            showNotification
            onNotificationPress={() => router.push('/(app)/notifications')}
          />
        ) : null}
        <View className="px-4 py-5">
          <HomeHealthState
            kind="empty"
            title="Selecciona un paciente"
            message="Necesitamos un contexto de paciente activo para mostrar el resumen de salud."
          />
        </View>
      </Screen>
    );
  }

  if (dashboard.isLoading) {
    return (
      <Screen contentClassName="px-0 py-0">
        {role !== 'caregiver' ? (
          <AppHeader
            showBackButton={false}
            showNotification
            onNotificationPress={() => router.push('/(app)/notifications')}
          />
        ) : null}
        <View className="px-4 py-5">
          <HomeHealthState
            kind="loading"
            title="Preparando tu resumen"
            message="Estamos consultando tus citas, medicación e indicadores."
          />
        </View>
      </Screen>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <Screen contentClassName="px-0 py-0">
        {role !== 'caregiver' ? (
          <AppHeader
            showBackButton={false}
            showNotification
            onNotificationPress={() => router.push('/(app)/notifications')}
          />
        ) : null}
        <View className="px-4 py-5">
          <HomeHealthState
            kind="error"
            title="No pudimos cargar Inicio"
            message="Revisa tu conexión e intenta nuevamente."
            onRetry={() => {
              void dashboard.refetch();
            }}
          />
        </View>
      </Screen>
    );
  }

  const data = dashboard.data;
  const metrics = homeHealthPresenter.latestMetrics(
    data.measurements,
    data.indicators,
    data.measurementUnits,
    data.alerts,
    4,
  );
  const nextAppointment = homeHealthPresenter.nextAppointment(data.appointments);
  const primaryAllergy = homeHealthPresenter.primaryAllergy(
    data.healthSummary.allergies,
  );
  const primaryAlert = [...data.alerts].sort(
    (a, b) =>
      new Date(b.fecha_alerta).getTime() -
      new Date(a.fecha_alerta).getTime(),
  )[0];

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      {role !== 'caregiver' ? (
        <AppHeader
            showBackButton={false}
            showNotification
            onNotificationPress={() => router.push('/(app)/notifications')}
          />
      ) : null}

      {role === 'caregiver' ? (
        <CaregiverHome
          patientName={patientName}
          data={data}
          metrics={metrics}
          primaryAlert={primaryAlert}
          primaryAllergy={primaryAllergy}
          nextAppointment={nextAppointment}
        />
      ) : (
        <PatientHome
          patientName={patientName}
          data={data}
          metrics={metrics}
          nextAppointment={nextAppointment}
        />
      )}
    </Screen>
  );
}

function PatientHome({
  patientName,
  data,
  metrics,
  nextAppointment,
}: {
  patientName: string;
  data: HomeHealthDashboardData;
  metrics: HealthMetric[];
  nextAppointment: AppointmentResponse | null;
}) {
  return (
    <View className="gap-5 px-4 py-5">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#DCECF6]">
          <Text className="text-lg font-bold text-[#4A86B6]">
            {homeHealthPresenter.firstName(patientName).charAt(0).toUpperCase()}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-xl font-bold text-coal-900">
            {homeHealthPresenter.greeting(patientName)}
          </Text>
          <Text className="mt-1 text-sm text-coal-500">
            Aquí tienes tu resumen de bienestar para hoy.
          </Text>
        </View>
      </View>

      {data.nextDose ? (
        <NextDoseCard
          dose={data.nextDose}
          actionLabel="Registrar dosis"
          onPress={() => router.push('/(app)/(tabs)/medication')}
        />
      ) : (
        <SurfaceCard>
          <Text className="text-sm font-semibold text-coal-900">Próxima dosis</Text>
          <Text className="mt-2 text-sm text-coal-500">
            No tienes una toma activa programada por ahora.
          </Text>
        </SurfaceCard>
      )}

      {nextAppointment ? (
        <NextAppointmentCard
          appointment={nextAppointment}
          appointmentTypes={data.appointmentTypes}
          onPress={() => router.push('/(app)/(tabs)/appointments')}
        />
      ) : (
        <SurfaceCard>
          <Text className="text-sm font-semibold text-coal-900">Próxima cita</Text>
          <Text className="mt-2 text-sm text-coal-500">
            No tienes citas próximas registradas.
          </Text>
        </SurfaceCard>
      )}

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-coal-900">Mi salud</Text>
          <Pressable onPress={() => router.push('/(app)/(tabs)/health')}>
            <Text className="text-xs font-semibold text-[#4A86B6]">Detalles →</Text>
          </Pressable>
        </View>

        {metrics.length > 0 ? (
          <View className="flex-row gap-3">
            {metrics.slice(0, 2).map((metric) => (
              <HealthMetricTile
                key={metric.indicatorId}
                metric={metric}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/health-indicators/[indicadorId]/history',
                    params: { indicadorId: metric.indicatorId },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <SurfaceCard>
            <Text className="text-sm text-coal-500">
              Aún no tienes mediciones registradas.
            </Text>
          </SurfaceCard>
        )}
      </View>

      <View className="gap-3">
        <Text className="text-base font-bold text-coal-900">Acciones rápidas</Text>
        <QuickAction
          icon="add-circle-outline"
          label="Registrar medición"
          onPress={() => router.push('/(app)/health-indicators')}
        />
        <QuickAction
          icon="medical-outline"
          label="Ver medicación"
          onPress={() => router.push('/(app)/(tabs)/medication')}
        />
        <QuickAction
          icon="calendar-outline"
          label="Ver próxima cita"
          onPress={() => router.push('/(app)/(tabs)/appointments')}
        />
      </View>
    </View>
  );
}

function CaregiverHome({
  patientName,
  data,
  metrics,
  primaryAlert,
  primaryAllergy,
  nextAppointment,
}: {
  patientName: string;
  data: HomeHealthDashboardData;
  metrics: HealthMetric[];
  primaryAlert: AlertaClinicaResponse | undefined;
  primaryAllergy: AllergySummary | null;
  nextAppointment: AppointmentResponse | null;
}) {
  const alertMessage =
    primaryAlert?.mensaje ??
    primaryAllergy?.description ??
    (primaryAllergy
      ? `Alergia activa registrada: ${primaryAllergy.name}.`
      : null);

  return (
    <View className="gap-4 px-4 py-5">
      <View>
        <Text className="text-xl font-bold text-coal-900">Resumen del paciente</Text>
        <Text className="mt-1 text-xs text-coal-500">
          {patientName} · Última actualización: {homeHealthPresenter.formatLastUpdate(data.fetchedAt)}
        </Text>
      </View>

      {alertMessage ? (
        <ClinicalAlertCard
          title={primaryAlert ? 'Alerta clínica activa' : `Alergia: ${primaryAllergy?.name ?? ''}`}
          message={alertMessage}
          badge={primaryAllergy?.severity ?? null}
        />
      ) : null}

      {data.nextDose ? (
        <NextDoseCard
          compact
          dose={data.nextDose}
          actionLabel="Ver pauta completa"
          onPress={() => router.push('/(app)/(tabs)/medication')}
        />
      ) : null}

      {nextAppointment ? (
        <NextAppointmentCard
          appointment={nextAppointment}
          appointmentTypes={data.appointmentTypes}
          onPress={() => router.push('/(app)/(tabs)/appointments')}
        />
      ) : null}

      <View className="gap-3">
        <Text className="text-base font-bold text-coal-900">Últimos indicadores</Text>

        {metrics.length > 0 ? (
          <View className="flex-row flex-wrap gap-3">
            {metrics.map((metric) => (
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
          <SurfaceCard>
            <Text className="text-sm text-coal-500">
              Este paciente aún no tiene mediciones registradas.
            </Text>
          </SurfaceCard>
        )}
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center rounded-2xl border border-coal-500/10 bg-white px-4 py-4 active:opacity-80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#E7F2F7]">
        <Ionicons name={icon} size={16} color="#4A86B6" />
      </View>
      <Text className="ml-3 flex-1 text-sm font-semibold text-coal-900">{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#7B848B" />
    </Pressable>
  );
}
