/**
 * CSS global procesado por NativeWind.
 *
 * Aunque sea React Native, este archivo
 * se convierte a estilos nativos mediante Metro.
 */
import '../../global.css';

import {
  Stack,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  PropsWithChildren,
} from 'react';

import {
  AppProviders,
} from '@/providers/AppProviders';

import {
  theme,
} from '@/shared/theme/tokens';

function AuthBootstrap({
  children,
}: PropsWithChildren) {
  return children;
}

/**
 * Equivalente al App.tsx raíz
 * de una aplicación React tradicional.
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