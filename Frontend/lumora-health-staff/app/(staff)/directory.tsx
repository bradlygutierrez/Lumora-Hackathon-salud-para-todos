import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PermissionGate } from '@/src/features/auth/components/PermissionGate';
import { useProfessionals } from '@/src/features/profile/hooks/use-professionals';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export default function MedicalDirectoryScreen() {
  const professionals = useProfessionals();

  return (
    <Screen>
      <PermissionGate
        anyOf={['clinica:manage', 'rbac:manage']}
        fallback={
          <ErrorState
            title="Acceso restringido"
            message="El directorio médico requiere permisos clínicos en la sesión."
          />
        }
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Directorio médico</Text>
            <Text style={styles.subtitle}>Profesionales registrados en FastAPI.</Text>
          </View>

          {professionals.isLoading ? <LoadingState title="Cargando directorio" /> : null}
          {professionals.isError ? <ErrorState title="No se pudo cargar el directorio" /> : null}
          {professionals.data?.items.length === 0 ? (
            <EmptyState title="Sin profesionales registrados" />
          ) : null}

          {professionals.data?.items.map((professional) => (
            <Link
              href={`/(staff)/staff/${professional.id}`}
              key={professional.id}
              style={styles.card}
            >
              <Text style={styles.name}>
                {professional.persona.nombres} {professional.persona.apellidos}
              </Text>
              <Text style={styles.meta}>{professional.especialidad}</Text>
              <Text style={styles.meta}>Licencia {professional.numero_licencia}</Text>
            </Link>
          ))}
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
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
    padding: theme.spacing.lg,
  },
  name: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  meta: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
});
