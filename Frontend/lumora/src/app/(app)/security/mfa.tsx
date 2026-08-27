import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

/**
 * Configuración MFA autenticada.
 *
 * El backend B08 anuncia solo `totp`. No existe SMS y la UI no lo ofrece.
 */
export default function SecurityMfaRoute() {
  const queryClient = useQueryClient();

  const methods = useQuery({
    queryKey: ['auth', 'mfa-methods'],
    queryFn: () => authApi.mfaMethods(),
  });

  const setup = useMutation({
    mutationFn: (methodId: number) => authApi.setupMfa(methodId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-methods'] }),
  });

  const disable = useMutation({
    mutationFn: (configuredMethodId: number) =>
      authApi.disableMfa(configuredMethodId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-methods'] }),
  });

  const totp = methods.data?.find((method) => method.nombre === 'totp');

  return (
    <Screen scrollable contentClassName="gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-bold text-coal-900">
          Autenticación de Dos Factores
        </Text>
        <Text className="text-base leading-6 text-coal-500">
          Lumora soporta Authenticator/TOTP. SMS no está implementado.
        </Text>
      </View>

      {methods.isPending ? (
        <Text className="text-sm text-coal-500">Consultando métodos...</Text>
      ) : null}

      {methods.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {methods.error instanceof ApiError
            ? methods.error.message
            : 'No fue posible consultar MFA.'}
        </Text>
      ) : null}

      {totp ? (
        <View className="gap-3 rounded-2xl border border-lumen-300 bg-bone-300 p-4">
          <Text className="text-lg font-semibold text-coal-900">
            App de autenticación
          </Text>
          <Text className="text-sm text-coal-500">
            Estado: {totp.activo ? 'Activo' : 'Inactivo'}
          </Text>

          {totp.activo && totp.id ? (
            <AppButton
              variant="ghost"
              title="Desactivar"
              loading={disable.isPending}
              onPress={() => disable.mutate(totp.id!)}
            />
          ) : (
            <AppButton
              title="Configurar"
              loading={setup.isPending}
              onPress={() => setup.mutate(totp.metodo_id)}
            />
          )}
        </View>
      ) : null}

      {setup.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {setup.error instanceof ApiError
            ? setup.error.message
            : 'No fue posible configurar MFA.'}
        </Text>
      ) : null}

      {setup.data ? (
        <View className="gap-3 rounded-2xl bg-lumen-300 p-4">
          <Text className="font-bold text-coal-900">Configuración TOTP</Text>
          <Text className="text-sm leading-5 text-coal-700">
            Agrega esta clave manualmente en tu app de autenticación.
          </Text>
          <Text selectable className="font-mono text-sm text-coal-900">
            {setup.data.secret}
          </Text>
          <Text selectable className="text-xs text-coal-500">
            {setup.data.provisioning_uri}
          </Text>

          <Text className="mt-2 text-sm font-semibold text-coal-900">
            Guarda estos códigos de recuperación en un lugar seguro:
          </Text>
          {setup.data.recovery_codes.map((code) => (
            <Text key={code} selectable className="font-mono text-sm text-coal-700">
              {code}
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
