import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/shared/components/Screen';

/**
 * Placeholder B11 con acceso funcional a Seguridad B08.
 * Cuando B11 construya Perfil, debe conservar este destino de navegación.
 */
export default function ProfileRoute() {
  return (
    <Screen contentClassName="gap-5">
      <View className="rounded-2xl bg-lumen-300 p-6">
        <Text className="text-2xl font-bold text-coal-900">Perfil</Text>
        <Text className="mt-2 text-base leading-6 text-coal-500">
          El perfil completo será implementado en B11.
        </Text>
      </View>

      <Link href="/(app)/security" asChild>
        <Pressable
          accessibilityRole="link"
          className="rounded-2xl border border-lumen-500 bg-bone-300 p-4 active:opacity-75"
        >
          <Text className="text-lg font-semibold text-coal-900">
            Centro de Seguridad
          </Text>
          <Text className="mt-1 text-sm text-coal-500">
            Contraseña, MFA y sesiones activas.
          </Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
