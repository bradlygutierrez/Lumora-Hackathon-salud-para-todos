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
        anyOf={['clinica:manage']}
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
          <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
            <AppTopBar showBack />
            <View style={styles.header}>
              <Text style={styles.title}>Perfil del Staff</Text>
              <Text style={styles.subtitle}>Información profesional registrada en Lumora.</Text>
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
                <Text style={styles.badge}>Licencia: {professional.data.numero_licencia}</Text>
                <InfoRow
                  label="Contacto"
                  value={professional.data.persona.telefono ?? 'No disponible'}
                />
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
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
  badge: {
    backgroundColor: '#EBEEF4',
    borderRadius: theme.radius.pill,
    color: theme.color.mutedText,
    fontSize: 12,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
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
});
