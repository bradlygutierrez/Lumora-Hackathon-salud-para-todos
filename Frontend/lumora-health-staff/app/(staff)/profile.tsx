import { StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export default function StaffProfileScreen() {
  const { signOut } = useAuthSession();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <Text style={styles.subtitle}>Sesión protegida con SecureStore.</Text>
        </View>
        <Button accessibilityLabel="Cerrar sesión" onPress={signOut}>
          Cerrar sesión
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.xl,
    justifyContent: 'space-between',
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
});
