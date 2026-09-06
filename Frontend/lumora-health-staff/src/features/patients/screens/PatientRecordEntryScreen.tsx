import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { usePatientClinicalSummary } from '../hooks/use-patients';

type Props = { patientId: number };

export function PatientRecordEntryScreen({ patientId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const summary = usePatientClinicalSummary(patientId);

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para consultar el expediente." />;
  }
  if (summary.isLoading) return <LoadingState title="Cargando expediente" />;
  if (summary.isError || !summary.data) {
    return <ErrorState title="No se pudo cargar el expediente" message="Verificá el acceso clínico." />;
  }

  const record = summary.data.expediente;

  return (
    <Screen tint="patients">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Button accessibilityLabel="Volver al paciente" icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver
        </Button>
        <View style={styles.heading}>
          <Ionicons color={theme.color.primary} name="folder-open-outline" size={28} />
          <View style={styles.headingText}>
            <Text style={styles.title}>Expediente Médico</Text>
            <Text style={styles.subtitle}>Entrada segura al expediente, respaldada por el resumen clínico del paciente.</Text>
          </View>
        </View>

        {record ? (
          <View style={styles.card}>
            <Text style={styles.label}>Número de expediente</Text>
            <Text style={styles.recordNumber}>{record.numero_expediente}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Estado</Text>
              <Text style={styles.value}>{record.activo ? 'Activo' : 'Inactivo'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estado clínico ID</Text>
              <Text style={styles.value}>{record.estado_expediente_id}</Text>
            </View>
            {record.notas ? (
              <View style={styles.notes}>
                <Text style={styles.label}>Notas del expediente</Text>
                <Text style={styles.value}>{record.notas}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState
            title="Sin expediente"
            message="El paciente no tiene expediente clínico disponible."
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  heading: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  headingText: { flex: 1, gap: theme.spacing.xs },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  label: { color: theme.color.mutedText, fontSize: theme.typography.caption, fontWeight: '700' },
  recordNumber: { color: theme.color.primary, fontSize: 28, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  value: { color: theme.color.text, fontSize: theme.typography.body },
  notes: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md, gap: theme.spacing.sm, padding: theme.spacing.md },
});
