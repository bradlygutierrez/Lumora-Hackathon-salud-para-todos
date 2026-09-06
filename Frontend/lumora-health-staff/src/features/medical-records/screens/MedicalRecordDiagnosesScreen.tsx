import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(parsed);
}

export function MedicalRecordDiagnosesScreen({ patientId, recordId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const summaryQuery = useMedicalRecordSummary(patientId);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar diagnósticos clínicos."
      />
    );
  }

  if (summaryQuery.isLoading) return <LoadingState title="Cargando diagnósticos" />;

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title="No se pudieron cargar los diagnósticos"
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

  const diagnoses = summary.consultas
    .flatMap((entry) =>
      entry.diagnosticos.map((diagnosis) => ({
        consultation: entry.consulta,
        diagnosis,
      })),
    )
    .sort((left, right) =>
      right.diagnosis.fecha_diagnostico.localeCompare(
        left.diagnosis.fecha_diagnostico,
      ),
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
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
          <Text style={styles.title}>Diagnósticos</Text>
          <Text style={styles.subtitle}>
            {summary.paciente.nombres} {summary.paciente.apellidos} ·{' '}
            {diagnoses.length === 1 ? '1 diagnóstico' : `${diagnoses.length} diagnósticos`}
          </Text>
        </View>

        {diagnoses.length === 0 ? (
          <EmptyState
            title="Sin diagnósticos"
            message="El backend no reporta diagnósticos activos en las consultas de este expediente."
          />
        ) : (
          <View style={styles.list}>
            {diagnoses.map(({ consultation, diagnosis }) => (
              <Pressable
                accessibilityLabel={`Abrir diagnóstico ${diagnosis.id}`}
                accessibilityRole="button"
                key={diagnosis.id}
                onPress={() =>
                  router.push(
                    `/(staff)/patients/${patientId}/record/consultations/${consultation.id}/diagnoses?recordId=${recordId}` as Href,
                  )
                }
                style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
              >
                <View style={styles.cardIcon}>
                  <Ionicons
                    color={theme.color.primaryPressed}
                    name="clipboard-outline"
                    size={20}
                  />
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{diagnosis.descripcion}</Text>
                    {diagnosis.es_principal ? (
                      <Text style={styles.primaryBadge}>Principal</Text>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>
                    {formatDate(diagnosis.fecha_diagnostico)} ·{' '}
                    {consultation.motivo ?? 'Consulta médica'} · Consulta #{consultation.id}
                  </Text>
                  <Text style={styles.actionText}>Abrir diagnósticos de esta consulta</Text>
                </View>
                <Ionicons color={theme.color.subtleText} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
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
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  pressed: { opacity: 0.78 },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardCopy: { flex: 1, gap: 5 },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cardTitle: { color: theme.color.text, flexShrink: 1, fontSize: 15, fontWeight: '800' },
  primaryBadge: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    color: theme.color.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  meta: { color: theme.color.mutedText, fontSize: 12, lineHeight: 18 },
  actionText: { color: theme.color.primaryPressed, fontSize: 12, fontWeight: '800' },
});
