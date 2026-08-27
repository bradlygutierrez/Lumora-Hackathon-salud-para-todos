import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PermissionGate } from '@/src/features/auth/components/PermissionGate';
import { useProfessional } from '@/src/features/profile/hooks/use-professionals';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
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
            <View style={styles.header}>
              <Text style={styles.title}>
                {professional.data.persona.nombres} {professional.data.persona.apellidos}
              </Text>
              <Text style={styles.subtitle}>{professional.data.especialidad}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Licencia</Text>
              <Text style={styles.value}>{professional.data.numero_licencia}</Text>
              <Text style={styles.label}>Teléfono</Text>
              <Text style={styles.value}>
                {professional.data.persona.telefono ?? 'No disponible'}
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </PermissionGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  label: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  value: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
});
