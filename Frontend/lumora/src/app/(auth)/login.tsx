import { Text, View } from 'react-native';

import { Screen } from '@/shared/components/Screen';

/**
 * Placeholder intencional de B07.
 * B08 reemplazará esta ruta con el login real basado en Figma/FastAPI.
 */
export default function LoginRoute() {
  return (
    <Screen contentClassName="justify-between">
      <View className="mt-12 gap-2">
        <Text className="text-4xl font-bold text-coal-900">Lumora</Text>
        <Text className="text-xl text-coal-500">Tu salud, acompañada.</Text>
      </View>

      <View className="rounded-xl bg-lumen-300 p-4">
        <Text className="text-base text-coal-900">
          El flujo de autenticación se implementará en B08.
        </Text>
      </View>
    </Screen>
  );
}
