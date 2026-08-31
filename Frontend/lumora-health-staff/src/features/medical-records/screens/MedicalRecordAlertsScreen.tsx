import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { useMedicalRecordSummary } from '../hooks/use-medical-record';

type Props = {
  patientId: number;
  recordId: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function MedicalRecordAlertsScreen({ patientId, recordId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const summaryQuery = useMedicalRecordSummary(patientId);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar alertas clínicas."
      />
    );
  }

  if (summaryQuery.isLoading) return <LoadingState title="Cargando alertas clínicas" />;

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title="No se pudieron cargar las alertas"
        message="Verificá la conexión y el acceso clínico del paciente."
      />
    );
  }

  const summary = summaryQuery.data;
  if (!summary.expediente || summary.expediente.id !== recordId) {
    return (
      <ErrorState
        title="Expediente no disponible"
        message="El expediente solicitado no coincide con el expediente activo del paciente."
      />
    );
  }

  const alerts = [...summary.alertas].sort((left, right) => {
    if (left.atendida !== right.atendida) {
      return Number(left.atendida) - Number(right.atendida);
    }
    return right.fecha_alerta.localeCompare(left.fecha_alerta);
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button
          accessibilityLabel="Volver al resumen clínico"
          icon="arrow-back"
          onPress={() => router.back()}
          variant="ghost"
        >
          Volver
        </Button>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPEDIENTE MÉDICO</Text>
          <Text style={styles.title}>Alertas clínicas</Text>
          <Text style={styles.subtitle}>
            {summary.paciente.nombres} {summary.paciente.apellidos} ·{' '}
            {alerts.length === 1 ? '1 alerta' : `${alerts.length} alertas`}
          </Text>
        </View>

        <Button
          accessibilityLabel="Ver historial de mediciones desde alertas"
          icon="analytics-outline"
          onPress={() =>
            router.push(`/(staff)/patients/${patientId}/measurements` as Href)
          }
          variant="secondary"
        >
          Ver historial de mediciones
        </Button>

        {alerts.length === 0 ? (
          <EmptyState
            title="Sin alertas clínicas"
            message="El resumen clínico del backend no reporta alertas para este paciente."
          />
        ) : (
          <View style={styles.list}>
            {alerts.map((alert) => (
              <View key={alert.id} style={styles.card}>
                <View style={styles.cardHeading}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      color={theme.color.warning}
                      name="warning-outline"
                      size={20}
                    />
                  </View>
                  <View style={styles.headingCopy}>
                    <Text style={styles.severity}>{alert.nivel_severidad}</Text>
                    <Text style={styles.type}>{alert.tipo_alerta}</Text>
                  </View>
                  <Text style={styles.status}>
                    {alert.atendida ? 'Atendida' : 'Pendiente'}
                  </Text>
                </View>
                <Text style={styles.message}>{alert.mensaje}</Text>
                <Text style={styles.meta}>
                  Generada: {formatDateTime(alert.fecha_alerta)}
                </Text>
                {alert.fecha_atencion ? (
                  <Text style={styles.meta}>
                    Atendida: {formatDateTime(alert.fecha_atencion)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { gap: theme.spacing.xs },
  eyebrow: {
    color: theme.color.subtleText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: { color: theme.color.text, fontSize: 27, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  list: { gap: theme.spacing.sm },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderRadius: theme.radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headingCopy: { flex: 1, gap: 2 },
  severity: {
    color: theme.color.warning,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  type: { color: theme.color.text, fontSize: 14, fontWeight: '800' },
  status: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.pill,
    color: theme.color.mutedText,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  message: { color: theme.color.text, fontSize: 14, lineHeight: 20 },
  meta: { color: theme.color.mutedText, fontSize: 12, lineHeight: 18 },
});
