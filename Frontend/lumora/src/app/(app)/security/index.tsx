import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/shared/components/Screen';

type SecurityItemProps = {
  href:
    | '/(app)/security/change-password'
    | '/(app)/security/mfa'
    | '/(app)/security/sessions';
  title: string;
  description: string;
};

function SecurityItem({ href, title, description }: SecurityItemProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        className="rounded-2xl border border-lumen-300 bg-bone-300 p-4 active:opacity-75"
      >
        <Text className="text-lg font-semibold text-coal-900">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-coal-500">
          {description}
        </Text>
      </Pressable>
    </Link>
  );
}

/** Hub autenticado del Centro de Seguridad de B08. */
export default function SecurityCenterRoute() {
  return (
    <Screen scrollable contentClassName="gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-bold text-coal-900">
          Centro de Seguridad
        </Text>
        <Text className="text-base leading-6 text-coal-500">
          Administra tu contraseña, autenticación en dos pasos y dispositivos.
        </Text>
      </View>

      <View className="gap-3">
        <SecurityItem
          href="/(app)/security/change-password"
          title="Cambiar contraseña"
          description="Actualiza tu contraseña. El backend conserva esta sesión y revoca las demás."
        />
        <SecurityItem
          href="/(app)/security/mfa"
          title="Autenticación de Dos Factores"
          description="Configura o desactiva Authenticator/TOTP."
        />
        <SecurityItem
          href="/(app)/security/sessions"
          title="Sesiones Activas"
          description="Revisa y revoca dispositivos conectados a tu cuenta."
        />
      </View>
    </Screen>
  );
}
