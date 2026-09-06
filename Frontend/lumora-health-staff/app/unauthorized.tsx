import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export default function UnauthorizedScreen() {
  const { signOut, status } = useAuthSession();

  if (status === 'anonymous') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Acceso clínico no autorizado</Text>
        <Text style={styles.message}>
          Tu cuenta está autenticada, pero no tiene el permiso clínico requerido para Health Staff.
        </Text>
        <Button icon="log-out-outline" onPress={signOut} variant="secondary">
          Cerrar sesión
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    justifyContent: 'center',
    minHeight: 320,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
});
