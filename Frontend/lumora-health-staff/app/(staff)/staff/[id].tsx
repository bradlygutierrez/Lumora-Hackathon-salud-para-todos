import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PermissionGate } from '@/src/features/auth/components/PermissionGate';
import { useProfessional } from '@/src/features/profile/hooks/use-professionals';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { StaffAvatar } from '@/src/shared/components/StaffAvatar';
import { theme } from '@/src/shared/constants/theme';

export default function StaffDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const professionalId = Number(params.id);
  const professional = useProfessional(professionalId);

  return (
    <Screen>
      <PermissionGate
        anyOf={['clinica:manage', 'rbac:manage']}
        fallback={
          <ErrorState
            title="Acceso restringido"
            message="El perfil del staff requiere permisos clínicos en la sesión."
          />
        }
      >
        {professional.isLoading ? <LoadingState title="Cargando perfil" /> : null}
        {professional.isError ? <ErrorState title="No se pudo cargar el perfil" /> : null}
        {professional.data ? (
          <ScrollView contentContainerStyle={styles.container}>
            <AppTopBar />
            <View style={styles.header}>
              <Text style={styles.title}>Perfil del Staff</Text>
              <Text style={styles.subtitle}>Gestionar detalles del personal y asignaciones.</Text>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.sideRail} />
              <View style={styles.profileContent}>
                <StaffAvatar
                  firstName={professional.data.persona.nombres}
                  lastName={professional.data.persona.apellidos}
                  size={96}
                />
                <Text style={styles.name}>
                  {professional.data.persona.nombres} {professional.data.persona.apellidos}
                </Text>
                <Text style={styles.specialty}>{professional.data.especialidad}</Text>
                <View style={styles.badges}>
                  <Text style={styles.badge}>LIC-{professional.data.numero_licencia}</Text>
                  <Text style={[styles.badge, styles.activeBadge]}>Cuenta Activa</Text>
                </View>
                <InfoRow label="Departamento" value={professional.data.especialidad} />
                <InfoRow
                  label="Contacto"
                  value={professional.data.persona.telefono ?? 'No disponible'}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Especialidades y Certificaciones</Text>
              <Certification
                organization="Lumora Health"
                progress={82}
                title={professional.data.especialidad}
              />
              <Certification
                organization="Lumora HN2026"
                progress={48}
                title="Atención clínica avanzada"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Resumen de Pacientes Asignados</Text>
              <View style={styles.statsRow}>
                <Stat label="ACTIVO" value="24" />
                <Stat danger label="CRÍTICO" value="3" />
                <Stat label="CONSULTAS" value="8" />
              </View>
            </View>
          </ScrollView>
        ) : null}
      </PermissionGate>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Certification({
  organization,
  progress,
  title,
}: {
  organization: string;
  progress: number;
  title: string;
}) {
  return (
    <View style={styles.certCard}>
      <Text style={styles.value}>{title}</Text>
      <Text style={styles.label}>{organization}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

function Stat({ danger = false, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, danger ? styles.statDanger : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  profileCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sideRail: {
    backgroundColor: theme.color.primary,
    width: 4,
  },
  profileContent: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
    padding: 24,
  },
  name: {
    color: theme.color.text,
    fontSize: 20,
    fontWeight: '900',
  },
  specialty: {
    color: theme.color.primary,
    fontSize: theme.typography.body,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
  badge: {
    backgroundColor: '#EBEEF4',
    borderRadius: theme.radius.pill,
    color: theme.color.mutedText,
    fontSize: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  activeBadge: {
    backgroundColor: theme.color.successSoft,
    color: theme.color.success,
  },
  infoRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  label: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  value: {
    color: theme.color.text,
    flexShrink: 1,
    fontSize: theme.typography.body,
    textAlign: 'right',
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: 24,
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 20,
    fontWeight: '900',
  },
  certCard: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: '#C3C6D580',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  progressTrack: {
    backgroundColor: theme.color.softBorder,
    borderRadius: theme.radius.pill,
    height: 4,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.pill,
    height: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderColor: '#C3C6D54D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.lg,
  },
  statValue: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
  },
  statDanger: {
    color: theme.color.danger,
  },
});
