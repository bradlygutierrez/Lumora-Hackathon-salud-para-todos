import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { usePatientFamily } from '../hooks/use-patients';
import type { PatientFamilyRelationship } from '../types/patient.types';

type Props = { patientId: number };

const statusLabels: Record<PatientFamilyRelationship['estado'], string> = {
  pending: 'Pendiente',
  active: 'Activo',
  revoked: 'Revocado',
  inactive: 'Inactivo',
  rejected: 'Rechazado',
};

export function PatientFamilyScreen({ patientId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const family = usePatientFamily(patientId);

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para consultar relaciones del paciente." />;
  }

  if (family.isLoading) return <LoadingState title="Cargando familiares" />;
  if (family.isError) {
    return <ErrorState title="No se pudieron cargar los familiares" message="Verificá el acceso al paciente." />;
  }

  return (
    <Screen tint="patients">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Button accessibilityLabel="Volver al paciente" icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver
        </Button>
        <View style={styles.heading}>
          <Text style={styles.title}>Familiares y Acceso</Text>
          <Text style={styles.subtitle}>
            Vista clínica de las relaciones autorizadas por el paciente. El personal no modifica estos permisos desde aquí.
          </Text>
        </View>

        {family.data?.length ? (
          <View style={styles.list}>
            {family.data.map((relationship) => (
              <RelationshipCard key={relationship.id} relationship={relationship} />
            ))}
          </View>
        ) : (
          <EmptyState title="Sin familiares vinculados" message="El backend no reporta relaciones activas o registradas." />
        )}
      </ScrollView>
    </Screen>
  );
}

function RelationshipCard({ relationship }: { relationship: PatientFamilyRelationship }) {
  const expires = relationship.expira_en
    ? new Date(relationship.expira_en).toLocaleDateString('es-NI')
    : 'Sin expiración';
  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{relationship.nombres.slice(0, 1)}{relationship.apellidos.slice(0, 1)}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{relationship.nombres} {relationship.apellidos}</Text>
          <Text style={styles.relationship}>{relationship.tipo_relacion}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabels[relationship.estado]}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <AccessRow
        icon="folder-open-outline"
        label="Acceso a registros"
        value={relationship.nivel_acceso === 'write' ? 'Lectura y escritura' : 'Lectura'}
      />
      <AccessRow
        icon="notifications-outline"
        label="Recibe notificaciones"
        value={relationship.recibir_notificaciones ? 'Sí' : 'No'}
      />
      <AccessRow icon="time-outline" label="Vigencia" value={expires} />
    </View>
  );
}

function AccessRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.accessRow}>
      <Ionicons color={theme.color.mutedText} name={icon} size={20} />
      <Text style={styles.accessLabel}>{label}</Text>
      <Text style={styles.accessValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  heading: { gap: theme.spacing.sm },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 15, lineHeight: 22 },
  list: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  identityRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  avatar: {
    alignItems: 'center', backgroundColor: theme.color.primarySoft, borderRadius: 24,
    height: 48, justifyContent: 'center', width: 48,
  },
  avatarText: { color: theme.color.info, fontSize: 16, fontWeight: '900' },
  identityText: { flex: 1, gap: 3 },
  name: { color: theme.color.text, fontSize: 18, fontWeight: '800' },
  relationship: { alignSelf: 'flex-start', backgroundColor: '#EEF1F6', borderRadius: 5, color: theme.color.mutedText, fontSize: 12, paddingHorizontal: 7, paddingVertical: 3 },
  statusBadge: { backgroundColor: theme.color.successSoft, borderRadius: theme.radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: theme.color.success, fontSize: 11, fontWeight: '800' },
  divider: { backgroundColor: theme.color.softBorder, height: 1 },
  accessRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  accessLabel: { color: theme.color.mutedText, flex: 1, fontSize: 14 },
  accessValue: { color: theme.color.text, fontSize: 14, fontWeight: '800' },
});
