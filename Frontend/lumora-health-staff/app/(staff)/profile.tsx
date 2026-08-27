import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useProfessionals } from '@/src/features/profile/hooks/use-professionals';
import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export default function StaffProfileScreen() {
  const { reloadUser, session, signOut } = useAuthSession();
  const professionals = useProfessionals();
  const user = session?.user;
  const professional = professionals.data?.items.find(
    (item) => item.persona.id === user?.persona.id,
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi perfil</Text>
          <Text style={styles.subtitle}>
            {user ? `${user.persona.nombres} ${user.persona.apellidos}` : 'Perfil no resuelto'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Usuario</Text>
          <Text style={styles.value}>{user?.username ?? 'No disponible'}</Text>
          <Text style={styles.label}>Correo</Text>
          <Text style={styles.value}>{user?.email ?? 'No disponible'}</Text>
          <Text style={styles.label}>Verificación</Text>
          <Text style={styles.value}>{user?.email_verificado ? 'Verificado' : 'Pendiente'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Especialidad</Text>
          <Text style={styles.value}>{professional?.especialidad ?? 'No vinculada'}</Text>
          <Text style={styles.label}>Licencia</Text>
          <Text style={styles.value}>{professional?.numero_licencia ?? 'No vinculada'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Roles</Text>
          <Text style={styles.value}>
            {user?.roles.map((role) => role.nombre).join(', ') || 'Sin roles cargados'}
          </Text>
          <Text style={styles.label}>Permisos</Text>
          <Text style={styles.value}>
            {user?.roles
              .flatMap((role) => role.permisos.map((permission) => permission.nombre))
              .join(', ') || 'Sin permisos cargados'}
          </Text>
        </View>
        <Button accessibilityLabel="Recargar perfil" onPress={reloadUser}>
          Recargar perfil
        </Button>
        <Button accessibilityLabel="Cerrar sesión" onPress={signOut}>
          Cerrar sesión
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.sm,
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
