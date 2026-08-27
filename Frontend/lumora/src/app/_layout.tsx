import '../../global.css';

import {
  Stack,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  AuthBootstrap,
} from '@/features/auth/components/AuthBootstrap';

import {
  AppProviders,
} from '@/providers/AppProviders';

import {
  theme,
} from '@/shared/theme/tokens';

/**
 * RootLayout es el equivalente al App.tsx
 * principal de React.
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <StatusBar
          style="dark"
          backgroundColor={
            theme.colors.background
          }
        />

        <Stack
          screenOptions={{
            headerShown: false,

            contentStyle: {
              backgroundColor:
                theme.colors.background,
            },
          }}
        />
      </AuthBootstrap>
    </AppProviders>
  );
}