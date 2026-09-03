import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { useMeasurementCatalogs, usePatientMeasurements } from '../hooks/use-measurements';
import { enrichMeasurements, trendDelta } from '../utils/measurement-format';

export function MeasurementHistoryScreen({
  patientId,
  onBack,
}: {
  patientId: number;
  onBack: () => void;
}) {
  const { permissions } = useAuthSession();
  const measurements = usePatientMeasurements(patientId);
  const catalogs = useMeasurementCatalogs();
  const [indicatorId, setIndicatorId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      enrichMeasurements(
        measurements.data ?? [],
        catalogs.indicators.data ?? [],
        catalogs.units.data?.items ?? [],
        catalogs.origins.data?.items ?? [],
      ),
    [
      measurements.data,
      catalogs.indicators.data,
      catalogs.units.data?.items,
      catalogs.origins.data?.items,
    ],
  );

  const visible = indicatorId
    ? enriched.filter((item) => item.indicador_id === indicatorId)
    : enriched;
  const delta = trendDelta(visible.map((item) => item.valor));

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar mediciones clínicas."
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button icon="arrow-back" onPress={onBack} variant="ghost">
          Volver
        </Button>

        <View style={styles.heading}>
          <Text style={styles.title}>Historial de mediciones</Text>
          <Text style={styles.subtitle}>
            Evolución cronológica de los indicadores registrados en Lumora.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIndicatorId(null)}
              style={[styles.filter, indicatorId === null ? styles.filterSelected : null]}
            >
              <Text>Todos</Text>
            </Pressable>
            {(catalogs.indicators.data ?? []).map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => setIndicatorId(item.id)}
                style={[
                  styles.filter,
                  indicatorId === item.id ? styles.filterSelected : null,
                ]}
              >
                <Text>{item.nombre}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {measurements.isLoading ? <LoadingState title="Cargando mediciones" /> : null}
        {measurements.isError ? (
          <ErrorState
            title="No se pudo cargar el historial"
            message="Verificá el acceso y la conexión."
          />
        ) : null}

        {!measurements.isLoading && !measurements.isError && visible.length === 0 ? (
          <EmptyState
            title="Sin mediciones"
            message="No hay registros para el indicador seleccionado."
          />
        ) : null}

        {delta !== null ? (
          <View style={styles.trend}>
            <Text style={styles.trendLabel}>Cambio respecto al registro anterior</Text>
            <Text style={styles.trendValue}>
              {delta > 0 ? '+' : ''}
              {delta.toFixed(2)}
            </Text>
          </View>
        ) : null}

        {visible.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.indicador}</Text>
            <Text style={styles.value}>
              {item.valor} {item.unidad}
            </Text>
            <Text style={styles.meta}>
              {new Intl.DateTimeFormat('es-NI', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(item.fecha_medicion))}
            </Text>
            <Text style={styles.meta}>Origen: {item.origen}</Text>
            {item.observaciones ? <Text style={styles.meta}>{item.observaciones}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  heading: { gap: theme.spacing.xs },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText },
  filters: { flexDirection: 'row', gap: theme.spacing.sm },
  filter: {
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  filterSelected: { backgroundColor: theme.color.primarySoft },
  trend: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    gap: 2,
    padding: theme.spacing.md,
  },
  trendLabel: { color: theme.color.mutedText, fontSize: 12 },
  trendValue: { color: theme.color.text, fontSize: 20, fontWeight: '900' },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.lg,
  },
  cardTitle: { color: theme.color.text, fontSize: 17, fontWeight: '800' },
  value: { color: theme.color.primary, fontSize: 20, fontWeight: '900' },
  meta: { color: theme.color.mutedText, fontSize: theme.typography.caption },
});
