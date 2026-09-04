import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppQueryProvider } from '@/src/application/providers/query-provider';
import { AuthSessionProvider } from '@/src/features/auth/hooks/use-auth-session';
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
  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="unauthorized" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <AppQueryProvider>
          <AuthSessionProvider>
            <RootNavigator />
          </AuthSessionProvider>
        </AppQueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
