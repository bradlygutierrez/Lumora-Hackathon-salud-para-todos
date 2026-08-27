import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppQueryProvider } from '@/src/application/providers/query-provider';
import {
  AuthSessionProvider,
  useAuthSession,
} from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';
import { theme } from '@/src/shared/constants/theme';

export const unstable_settings = {
  anchor: '(staff)',
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.color.background,
    primary: theme.color.primary,
    text: theme.color.text,
  },
};

function RootNavigator() {
  const { status } = useAuthSession();

  if (status === 'restoring') {
    return <LoadingState title="Restaurando sesión clínica" />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
      </Stack>
      {status === 'authenticated' ? <Redirect href="/(staff)" /> : null}
      {status === 'anonymous' ? <Redirect href="/(auth)/login" /> : null}
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AppQueryProvider>
        <AuthSessionProvider>
          <RootNavigator />
        </AuthSessionProvider>
      </AppQueryProvider>
    </ThemeProvider>
  );
}
