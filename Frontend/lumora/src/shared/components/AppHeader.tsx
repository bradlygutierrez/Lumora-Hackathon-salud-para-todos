import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
  type Href,
} from 'expo-router';

import {
  LumoraLogo,
} from '@/shared/components/branding/LumoraLogo';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;

  /**
   * Las pantallas que utilizan AppHeader muestran
   * navegación hacia atrás por defecto.
   *
   * Úsalo en false solamente en una pantalla
   * que sea realmente una raíz de navegación.
   */
  showBackButton?: boolean;

  /**
   * Permite sobrescribir completamente el
   * comportamiento de la flecha.
   *
   * Es útil cuando router.back() volvería a una
   * pantalla que inmediatamente sería bloqueada
   * por un navigation guard.
   */
  onBackPress?: () => void;

  /**
   * Destino seguro cuando el stack no contiene
   * ninguna pantalla anterior.
   */
  backFallbackHref?: Href;

  showNotification?: boolean;
  onNotificationPress?: () => void;
};

/**
 * Header compartido de Lumora.
 *
 * Mantiene una política de navegación segura:
 *
 * 1. onBackPress personalizado, si existe.
 * 2. router.back(), si existe historial.
 * 3. fallback explícito, si fue proporcionado.
 */
export function AppHeader({
  title,
  subtitle,
  showBackButton = true,
  onBackPress,
  backFallbackHref,
  showNotification = false,
  onNotificationPress,
}: AppHeaderProps) {
  const handleBackPress = () => {
    /**
     * Algunas pantallas tienen reglas especiales
     * de navegación, por ejemplo select-patient.
     */
    if (onBackPress) {
      onBackPress();
      return;
    }

    /**
     * Flujo normal: regresar a la pantalla anterior.
     */
    if (router.canGoBack()) {
      router.back();
      return;
    }

    /**
     * Si la pantalla fue abierta mediante replace,
     * redirect o deep link puede no existir historial.
     */
    if (backFallbackHref) {
      router.replace(
        backFallbackHref,
      );
    }
  };

  return (
    <View className="gap-4 border-b border-lumen-500/40 bg-bone-100 px-4 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <View
          className="flex-row items-center"
          style={{
            gap: 12,
          }}
        >
          {showBackButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={8}
              onPress={
                handleBackPress
              }
              className="h-10 w-10 items-center justify-center rounded-full active:bg-lumen-300"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#242a2f"
              />
            </Pressable>
          ) : null}

          <LumoraLogo
            size={28}
            compact
          />
        </View>

        {showNotification ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
            onPress={
              onNotificationPress
            }
            className="h-10 w-10 items-center justify-center rounded-full border border-lumen-500/40 bg-white"
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color="#242a2f"
            />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      {title ? (
        <View className="gap-1">
          <Text className="text-3xl font-bold text-coal-900">
            {title}
          </Text>

          {subtitle ? (
            <Text className="text-sm leading-5 text-coal-500">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}