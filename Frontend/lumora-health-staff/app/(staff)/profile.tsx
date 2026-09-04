import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useMfaMethods } from '@/src/features/auth/hooks/use-security';
import { useAccountProfile } from '@/src/features/profile/hooks/use-account';
import { useCurrentProfessional } from '@/src/features/profile/hooks/use-professionals';
import { resolveProfileImageUrl } from '@/src/features/profile/utils/profile-image';
import { Screen } from '@/src/shared/components/Screen';
import { StaffAvatar } from '@/src/shared/components/StaffAvatar';
import { theme } from '@/src/shared/constants/theme';

export default function StaffProfileScreen() {
  const { session, signOut } = useAuthSession();
  const currentProfessional = useCurrentProfessional();
  const account = useAccountProfile();
  const mfaMethods = useMfaMethods();
  const user = session?.user;
  const professional = currentProfessional.data;
  const fullName = user ? `${user.persona.nombres} ${user.persona.apellidos}` : 'Perfil no resuelto';
  const mfaActive = Boolean(mfaMethods.data?.some((method) => method.activo));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <AppTopBar showBack />

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <StaffAvatar
              firstName={user?.persona.nombres}
              imageUrl={resolveProfileImageUrl(account.data?.profile_image_url)}
              lastName={user?.persona.apellidos}
              size={96}
            />
          </View>
          <Text style={styles.title}>{fullName}</Text>
          <Text style={styles.subtitle}>{user?.email ?? 'Correo no disponible'}</Text>
          <Text style={styles.subtitle}>
            {user?.persona.telefono ?? professional?.persona.telefono ?? 'Teléfono no disponible'}
          </Text>
          <View style={styles.badges}>
            <Badge
              icon="mail-outline"
              label={user?.email_verificado ? 'Correo verificado' : 'Correo pendiente'}
            />
            <Badge
              icon="shield-checkmark-outline"
              label={`MFA ${mfaActive ? 'Activo' : 'Inactivo'}`}
              active={mfaActive}
            />
          </View>
        </View>

        <View style={styles.menuCard}>
          <Link href="/(staff)/edit-profile" asChild>
            <Pressable>
              <MenuRow icon="person-outline" title="Editar Perfil" />
            </Pressable>
          </Link>
          <Link href="/(staff)/security" asChild>
            <Pressable>
              <MenuRow icon="shield-checkmark-outline" title="Centro de Seguridad" />
            </Pressable>
          </Link>
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
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: 25,
  },
  avatarWrap: {
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 6,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    width: 24,
  },
  title: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
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
  badgeActive: {
    backgroundColor: theme.color.primaryPressed,
  },
  badgeText: {
    color: theme.color.primaryPressed,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  menuCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
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

function Badge({
  active = false,
  icon,
  label,
}: {
  active?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={[styles.badge, active ? styles.badgeActive : null]}>
      <Ionicons color={active ? '#FFFFFF' : theme.color.primaryPressed} name={icon} size={12} />
      <Text style={[styles.badgeText, active ? styles.badgeTextActive : null]}>{label}</Text>
    </View>
  );
}
