import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import {
  catalogName,
  formatClinicalDateTime,
  structuredHistoryErrorMessage,
} from '../components/structured-history.ui';
import {
  useCondition,
  useConditionHistory,
  useConditionStatuses,
} from '../hooks/use-structured-history';

const LIMIT = 10;

export function ConditionHistoryScreen({
  recordId,
  conditionId,
}: {
  recordId: number;
  conditionId: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [offset, setOffset] = useState(0);
  const condition = useCondition(recordId, conditionId, allowed);
  const history = useConditionHistory(
    recordId,
    conditionId,
    { limit: LIMIT, offset },
    allowed,
  );
  const statuses = useConditionStatuses(allowed);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar la trazabilidad de condiciones."
      />
    );
  }
  if (condition.isLoading || history.isLoading || statuses.isLoading) {
    return <LoadingState title="Cargando historial de condición" />;
  }
  if (condition.isError || !condition.data) {
    return (
      <ErrorState
        title="Historial no disponible"
        message="La condición no existe o fue eliminada; debe seguir disponible para poder consultar su historial."
      />
    );
  }
  if (history.isError || statuses.isError) {
    return (
      <ErrorState
        title="No se pudo cargar el historial"
        message={
          structuredHistoryErrorMessage(
            history.error ?? statuses.error,
            'consultar la trazabilidad de condiciones',
          ) ?? 'Verificá la conexión y los permisos clínicos.'
        }
      />
    );
  }

  const entries = history.data?.items ?? [];
  const total = history.data?.total ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver a condiciones
        </Button>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>TRAZABILIDAD</Text>
          <Text style={styles.title}>{condition.data.nombre}</Text>
          <Text style={styles.subtitle}>
            Estado actual: {catalogName(statuses.data?.items, condition.data.estado_condicion_id)}
          </Text>
        </View>

        {entries.length === 0 ? (
          <EmptyState
            title="Sin cambios registrados"
            message="La condición todavía no tiene eventos de historial disponibles."
          />
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.action}>{entry.accion.replaceAll('_', ' ')}</Text>
                  <Text style={styles.date}>{formatClinicalDateTime(entry.created_at)}</Text>
                </View>
                <Text style={styles.transition}>
                  {catalogName(statuses.data?.items, entry.estado_anterior_id)} →{' '}
                  {catalogName(statuses.data?.items, entry.estado_nuevo_id)}
                </Text>
                {entry.motivo ? <Text style={styles.detail}>{entry.motivo}</Text> : null}
                <Text style={styles.user}>
                  Usuario de trazabilidad: {entry.usuario_id ?? 'No disponible'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pagination}>
          <Button
            disabled={offset <= 0}
            onPress={() => setOffset((current) => Math.max(0, current - LIMIT))}
            variant="secondary"
          >
            Anterior
          </Button>
          <Text style={styles.pageText}>
            {total === 0 ? '0' : `${offset + 1}-${Math.min(offset + entries.length, total)}`} de {total}
          </Text>
          <Button
            disabled={offset + LIMIT >= total}
            onPress={() => setOffset((current) => current + LIMIT)}
            variant="secondary"
          >
            Siguiente
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  header: { gap: 4 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14 },
  list: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  cardTop: { flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  action: { color: theme.color.primaryPressed, fontSize: 13, fontWeight: '900' },
  date: { color: theme.color.subtleText, fontSize: 12 },
  transition: { color: theme.color.text, fontSize: 15, fontWeight: '800' },
  detail: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  user: { color: theme.color.subtleText, fontSize: 11 },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  pageText: { color: theme.color.mutedText, flex: 1, fontSize: 12, textAlign: 'center' },
});
