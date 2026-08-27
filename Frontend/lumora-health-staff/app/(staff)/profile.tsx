import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const fullName = user ? `${user.persona.nombres} ${user.persona.apellidos}` : 'Perfil no resuelto';
  const initials = user
    ? `${user.persona.nombres.slice(0, 1)}${user.persona.apellidos.slice(0, 1)}`
    : 'HS';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topIdentity}>
            <Ionicons color={theme.color.primaryPressed} name="person-circle-outline" size={22} />
            <Text style={styles.topTitle}>{fullName}</Text>
          </View>
          <Ionicons color={theme.color.primaryPressed} name="notifications-outline" size={22} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.title}>{fullName}</Text>
          <Text style={styles.subtitle}>{user?.email ?? 'Correo no disponible'}</Text>
          <Text style={styles.subtitle}>{user?.persona.telefono ?? 'Telefono no disponible'}</Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>
              {user?.email_verificado ? 'Correo verificado' : 'Correo pendiente'}
            </Text>
            <Text style={styles.badge}>MFA {user ? 'gestionable' : 'pendiente'}</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuRow icon="create-outline" title="Editar Perfil" />
          <MenuRow icon="keypad-outline" title="Cambiar Contraseña" />
          <Link href="/(staff)/security" asChild>
            <Pressable>
              <MenuRow icon="shield-checkmark-outline" title="Centro de Seguridad" />
            </Pressable>
          </Link>
          <MenuRow icon="options-outline" title="Ajustes de la App" />
          <Pressable onPress={signOut}>
            <MenuRow danger icon="log-out-outline" title="Cerrar Sesión" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos profesionales</Text>
          <Text style={styles.label}>Especialidad</Text>
          <Text style={styles.value}>{professional?.especialidad ?? 'No vinculada'}</Text>
          <Text style={styles.label}>Licencia</Text>
          <Text style={styles.value}>{professional?.numero_licencia ?? 'No vinculada'}</Text>
          <Text style={styles.label}>Roles</Text>
          <Text style={styles.value}>{user?.roles.map((role) => role.nombre).join(', ') || 'Sin roles cargados'}</Text>
        </View>
        <Button accessibilityLabel="Recargar perfil" icon="refresh-outline" onPress={reloadUser} variant="secondary">
          Recargar perfil
        </Button>
      </ScrollView>
    </Screen>
  );
}

function MenuRow({
  danger = false,
  icon,
  title,
}: {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Ionicons color={danger ? theme.color.danger : theme.color.primaryPressed} name={icon} size={22} />
      </View>
      <Text style={[styles.menuText, danger ? styles.menuTextDanger : null]}>{title}</Text>
      {!danger ? <Ionicons color={theme.color.mutedText} name="chevron-forward" size={18} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  topTitle: {
    color: theme.color.primaryPressed,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.xl,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.border,
    borderRadius: 52,
    borderWidth: 2,
    height: 104,
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    width: 104,
  },
  avatarText: {
    color: theme.color.text,
    fontSize: 34,
    fontWeight: '900',
  },
  title: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  badge: {
    backgroundColor: '#E8EEF8',
    borderRadius: 12,
    color: theme.color.primaryPressed,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  menuCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: theme.color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  menuText: {
    color: theme.color.text,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  menuTextDanger: {
    color: theme.color.danger,
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
  sectionTitle: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
});
