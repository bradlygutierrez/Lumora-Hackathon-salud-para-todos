import { KeyboardAvoidingView } from 'react-native';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  useMutation,
} from '@tanstack/react-query';

import {
  router,
} from 'expo-router';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import {
  Text,
  View,
} from 'react-native';

import {
  authApi,
} from '@/features/auth/api/auth-api';

import {
  AuthHeader,
} from '@/features/auth/components/AuthHeader';

import {
  VerificationCodeInput,
} from '@/features/auth/components/VerificationCodeInput';

import {
  mfaSchema,
  type MfaForm,
} from '@/features/auth/schemas/auth.schemas';

import {
  useAuthStore,
  type PendingMfa,
} from '@/features/auth/store/auth-store';

import {
  ApiError,
} from '@/shared/api/api-error';

import {
  AppButton,
} from '@/shared/components/AppButton';

import {
  Screen,
} from '@/shared/components/Screen';

/**
 * Contenido visual del challenge MFA.
 *
 * Mantener esta lógica fuera del JSX evita
 * llenar la pantalla de condicionales.
 */
class MfaChallengePresentation {
  /**
   * Texto explicativo principal.
   */
  public subtitle(
    challenge: PendingMfa,
  ): string {
    if (
      challenge.method ===
      'email'
    ) {
      return (
        'Enviamos un código de 6 dígitos ' +
        'a tu correo electrónico.'
      );
    }

    if (
      challenge.method ===
      'totp'
    ) {
      return (
        'Ingresa el código de 6 dígitos ' +
        'generado por tu app de autenticación.'
      );
    }

    return (
      'Ingresa tu código de verificación ' +
      'de 6 dígitos.'
    );
  }

  /**
   * Nombre legible del método.
   */
  public methodLabel(
    challenge: PendingMfa,
  ): string {
    switch (
      challenge.method
    ) {
      case 'email':
        return 'Código por correo';

      case 'totp':
        return 'App de autenticación';

      default:
        return 'Verificación MFA';
    }
  }

  /**
   * Convierte segundos a minutos amigables.
   */
  public expirationMinutes(
    challenge: PendingMfa,
  ): number {
    return Math.max(
      1,
      Math.ceil(
        challenge.expiresIn /
          60,
      ),
    );
  }
}

const presentation =
  new MfaChallengePresentation();

/**
 * Segunda etapa del login cuando
 * FastAPI responde mfa_required=true.
 */
export default function MfaLoginRoute() {
  const pendingMfa =
    useAuthStore(
      (state) =>
        state.pendingMfa,
    );

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );

  const form =
    useForm<MfaForm>({
      resolver:
        zodResolver(
          mfaSchema,
        ),

      defaultValues: {
        code: '',
      },
    });

  /**
   * Verifica el código contra el challenge
   * generado durante login.
   */
  const verify =
    useMutation({
      mutationFn:
        (
          code: string,
        ) => {
          if (
            !pendingMfa
          ) {
            throw new Error(
              'No hay desafío MFA activo.',
            );
          }

          return authApi
            .verifyMfa(
              pendingMfa
                .challengeToken,

              code,
            );
        },

      /**
       * Solamente después de validar MFA
       * recibimos tokens finales.
       */
      onSuccess:
        async (
          session,
        ) => {
          await setSession(
            session,
          );

          router.replace(
            '/(app)/(tabs)',
          );
        },
    });

  /**
   * Un challenge MFA no se persiste.
   *
   * Si el usuario reinicia la app,
   * debe autenticarse nuevamente.
   */
  if (!pendingMfa) {
    return (
      <Screen
        keyboardAvoiding
        scrollable
        contentClassName="justify-center gap-4"
      >
        <Text className="text-xl font-bold text-coal-900">
          Desafío MFA no disponible
        </Text>

        <Text className="text-base leading-6 text-coal-500">
          Inicia sesión nuevamente para generar un desafío válido.
        </Text>

        <AppButton
          title="Volver al login"
          onPress={() =>
            router.replace(
              '/(auth)/login',
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      contentClassName="justify-center gap-7"
      keyboardAvoiding
    >
      <AuthHeader
        title="Verificación en dos pasos"
        subtitle={
          presentation.subtitle(
            pendingMfa,
          )
        }
      />

      <View className="rounded-2xl border border-lumen-300 bg-bone-300 p-4">
        <Text className="text-sm font-semibold text-coal-900">
          {
            presentation.methodLabel(
              pendingMfa,
            )
          }
        </Text>

        <Text className="mt-1 text-sm leading-5 text-coal-500">
          El código expira en aproximadamente{' '}
          {
            presentation.expirationMinutes(
              pendingMfa,
            )
          }{' '}
          minuto(s).
        </Text>
      </View>

      <Controller
        control={
          form.control
        }
        name="code"
        render={({
          field,
          fieldState,
        }) => (
          <View className="gap-2">
            <VerificationCodeInput
              value={
                field.value
              }
              onChange={
                field.onChange
              }
            />

            {fieldState.error ? (
              <Text className="text-xs font-medium text-coal-900">
                {
                  fieldState
                    .error
                    .message
                }
              </Text>
            ) : null}
          </View>
        )}
      />

      {verify.error ? (
        <Text
          accessibilityRole="alert"
          className="text-sm text-coal-900"
        >
          {verify.error instanceof
          ApiError
            ? verify.error
                .message
            : 'Código inválido.'}
        </Text>
      ) : null}

      <AppButton
        title="Verificar identidad"
        loading={
          verify.isPending
        }
        onPress={
          form.handleSubmit(
            (
              values,
            ) =>
              verify.mutate(
                values.code,
              ),
          )
        }
      />
    </Screen>
  );
}