import { KeyboardAvoidingView } from 'react-native';
import {
  useState,
} from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  Text,
  View,
} from 'react-native';

import {
  authApi,
} from '@/features/auth/api/auth-api';

import {
  VerificationCodeInput,
} from '@/features/auth/components/VerificationCodeInput';

import type {
  MfaMethod,
  MfaMethodName,
} from '@/features/auth/types/auth.types';

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
 * Encapsula las reglas visuales y de interacción
 * del enrollment MFA.
 *
 * No conoce React ni Zustand.
 */
class MfaEnrollmentController {
  /**
   * Determina si un código puede enviarse.
   */
  public canConfirm(
    code: string,
  ): boolean {
    return /^\d{6}$/.test(
      code,
    );
  }

  /**
   * Nombre amigable del factor.
   */
  public title(
    method: MfaMethodName,
  ): string {
    return method ===
      'email'
      ? 'Código por correo'
      : 'App de autenticación';
  }

  /**
   * Texto descriptivo utilizado
   * en las tarjetas principales.
   */
  public description(
    method: MfaMethodName,
  ): string {
    if (
      method ===
      'email'
    ) {
      return (
        'Recibe un código de 6 dígitos en tu correo ' +
        'cada vez que necesites verificar tu identidad.'
      );
    }

    return (
      'Usa Google Authenticator, Microsoft Authenticator, ' +
      'Authy u otra aplicación compatible con TOTP.'
    );
  }

  /**
   * Estado legible para UI.
   */
  public status(
    method: MfaMethod,
  ): string {
    return method.activo
      ? 'Activo'
      : 'Inactivo';
  }

  /**
   * Convierte expiración en segundos
   * a minutos legibles.
   */
  public expirationMinutes(
    seconds:
      number | null,
  ): number | null {
    if (!seconds) {
      return null;
    }

    return Math.max(
      1,
      Math.ceil(
        seconds /
          60,
      ),
    );
  }
}

const enrollmentController =
  new MfaEnrollmentController();

/**
 * Centro de configuración MFA.
 *
 * Flujo:
 *
 * Email:
 * setup -> OTP correo -> confirm -> active
 *
 * TOTP:
 * setup -> secret -> código app -> confirm -> active
 */
export default function SecurityMfaRoute() {
  const queryClient =
    useQueryClient();

  /**
   * Método que actualmente está siendo configurado.
   */
  const [
    enrollmentMethod,
    setEnrollmentMethod,
  ] =
    useState<MfaMethodName | null>(
      null,
    );

  /**
   * Código de confirmación de 6 dígitos.
   */
  const [
    code,
    setCode,
  ] =
    useState('');

  /**
   * Se muestran solamente después
   * de activar MFA correctamente.
   */
  const [
    recoveryCodes,
    setRecoveryCodes,
  ] =
    useState<string[]>([]);

  // =========================================================
  // QUERY DE MÉTODOS
  // =========================================================

  const methods =
    useQuery({
      queryKey: [
        'auth',
        'mfa-methods',
      ],

      queryFn: () =>
        authApi.mfaMethods(),
    });

  // =========================================================
  // INICIAR CONFIGURACIÓN
  // =========================================================

  const setup =
    useMutation({
      mutationFn:
        (
          method: MfaMethod,
        ) =>
          authApi.setupMfa(
            method.metodo_id,
          ),

      onSuccess:
        () => {
          setCode('');
          setRecoveryCodes(
            [],
          );

          /**
           * El método continúa inactivo.
           * Refrescamos por consistencia con backend.
           */
          void queryClient
            .invalidateQueries({
              queryKey: [
                'auth',
                'mfa-methods',
              ],
            });
        },
    });

  // =========================================================
  // CONFIRMAR CONFIGURACIÓN
  // =========================================================

  const confirm =
    useMutation({
      mutationFn:
        async (
          verificationCode:
            string,
        ) => {
          if (
            !setup.data
          ) {
            throw new Error(
              'No existe una configuración MFA pendiente.',
            );
          }

          return authApi
            .confirmMfaSetup(
              setup.data
                .method_id,

              verificationCode,
            );
        },

      /**
       * Solamente aquí MFA pasa a activo.
       */
      onSuccess:
        (
          response,
        ) => {
          setRecoveryCodes(
            response
              .recovery_codes,
          );

          setCode('');

          setEnrollmentMethod(
            null,
          );

          /**
           * Ya no necesitamos los datos
           * temporales del setup.
           */
          setup.reset();

          void queryClient
            .invalidateQueries({
              queryKey: [
                'auth',
                'mfa-methods',
              ],
            });
        },
    });

  // =========================================================
  // DESACTIVAR MFA
  // =========================================================

  const disable =
    useMutation({
      mutationFn:
        (
          configuredMethodId:
            number,
        ) =>
          authApi.disableMfa(
            configuredMethodId,
          ),

      onSuccess:
        () => {
          setCode('');

          setRecoveryCodes(
            [],
          );

          setEnrollmentMethod(
            null,
          );

          setup.reset();
          confirm.reset();

          void queryClient
            .invalidateQueries({
              queryKey: [
                'auth',
                'mfa-methods',
              ],
            });
        },
    });

  /**
   * Buscamos por nombre y nunca por ID fijo.
   *
   * Los IDs pertenecen al catálogo de base de datos
   * y no deben hardcodearse.
   */
  const email =
    methods.data?.find(
      (
        method,
      ) =>
        method.nombre ===
        'email',
    );

  const totp =
    methods.data?.find(
      (
        method,
      ) =>
        method.nombre ===
        'totp',
    );

  /**
   * Inicia un nuevo enrollment.
   */
  const startSetup = (
    method: MfaMethod,
  ) => {
    setEnrollmentMethod(
      method.nombre,
    );

    setCode('');

    setRecoveryCodes(
      [],
    );

    confirm.reset();

    setup.mutate(
      method,
    );
  };

  /**
   * Confirma el código solamente si
   * cumple el formato esperado.
   */
  const confirmSetup =
    () => {
      if (
        !enrollmentController
          .canConfirm(
            code,
          )
      ) {
        return;
      }

      confirm.mutate(
        code,
      );
    };

  /**
   * Reutiliza el mismo diseño para ambas
   * tarjetas de métodos MFA.
   */
  const renderMethodCard = (
    method: MfaMethod,
  ) => (
    <View
      key={
        method.nombre
      }
      className="gap-4 rounded-3xl border border-lumen-300 bg-bone-300 p-5"
    >
      <View className="gap-1">
        <Text className="text-lg font-bold text-coal-900">
          {
            enrollmentController.title(
              method.nombre,
            )
          }
        </Text>

        <Text className="text-sm leading-5 text-coal-500">
          {
            enrollmentController.description(
              method.nombre,
            )
          }
        </Text>
      </View>

      <View className="self-start rounded-full bg-lumen-300 px-3 py-1.5">
        <Text className="text-xs font-semibold text-coal-900">
          {
            enrollmentController.status(
              method,
            )
          }
        </Text>
      </View>

      {method.activo &&
      method.id ? (
        <AppButton
          variant="ghost"
          title="Desactivar"
          loading={
            disable.isPending
          }
          onPress={() =>
            disable.mutate(
              method.id!,
            )
          }
        />
      ) : (
        <AppButton
          title={
            method.nombre ===
            'email'
              ? 'Configurar correo'
              : 'Configurar aplicación'
          }
          loading={
            setup.isPending &&
            enrollmentMethod ===
              method.nombre
          }
          onPress={() =>
            startSetup(
              method,
            )
          }
        />
      )}
    </View>
  );

  return (
    <Screen
      scrollable
      keyboardAvoiding
      contentClassName="gap-6"
    >
      <View className="gap-2">
        <Text className="text-3xl font-bold text-coal-900">
          Autenticación de dos factores
        </Text>

        <Text className="text-base leading-6 text-coal-500">
          Agrega una capa extra de seguridad a tu cuenta.
        </Text>
      </View>

      {methods.isPending ? (
        <Text className="text-sm text-coal-500">
          Consultando métodos de seguridad...
        </Text>
      ) : null}

      {methods.error ? (
        <Text
          accessibilityRole="alert"
          className="text-sm text-coal-900"
        >
          {methods.error instanceof
          ApiError
            ? methods.error
                .message
            : 'No fue posible consultar los métodos MFA.'}
        </Text>
      ) : null}

      {email
        ? renderMethodCard(
            email,
          )
        : null}

      {totp
        ? renderMethodCard(
            totp,
          )
        : null}

      {setup.error ? (
        <Text
          accessibilityRole="alert"
          className="text-sm text-coal-900"
        >
          {setup.error instanceof
          ApiError
            ? setup.error
                .message
            : 'No fue posible iniciar la configuración MFA.'}
        </Text>
      ) : null}

      {/* =====================================================
          EMAIL OTP ENROLLMENT
         ===================================================== */}

      {setup.data &&
      enrollmentMethod ===
        'email' ? (
        <View className="gap-5 rounded-3xl bg-lumen-300 p-5">
          <View className="gap-1">
            <Text className="text-lg font-bold text-coal-900">
              Revisa tu correo
            </Text>

            <Text className="text-sm leading-5 text-coal-700">
              Enviamos un código de 6 dígitos a tu correo electrónico.
              Escríbelo para activar este método.
            </Text>

            {enrollmentController
              .expirationMinutes(
                setup.data
                  .expires_in,
              ) ? (
              <Text className="text-xs text-coal-500">
                El código expira en aproximadamente{' '}
                {
                  enrollmentController
                    .expirationMinutes(
                      setup.data
                        .expires_in,
                    )
                }{' '}
                minuto(s).
              </Text>
            ) : null}
          </View>

          <VerificationCodeInput
            value={code}
            onChange={
              setCode
            }
          />

          <AppButton
            title="Confirmar código"
            loading={
              confirm.isPending
            }
            onPress={
              confirmSetup
            }
          />
        </View>
      ) : null}

      {/* =====================================================
          TOTP ENROLLMENT
         ===================================================== */}

      {setup.data &&
      enrollmentMethod ===
        'totp' ? (
        <View className="gap-5 rounded-3xl bg-lumen-300 p-5">
          <View className="gap-1">
            <Text className="text-lg font-bold text-coal-900">
              Configura tu aplicación
            </Text>

            <Text className="text-sm leading-5 text-coal-700">
              Agrega Lumora a tu aplicación Authenticator y después
              ingresa el código generado.
            </Text>
          </View>

          {setup.data
            .secret ? (
            <View className="gap-2 rounded-2xl bg-bone-300 p-4">
              <Text className="text-xs font-semibold text-coal-500">
                Clave manual
              </Text>

              <Text
                selectable
                className="font-mono text-base font-semibold text-coal-900"
              >
                {
                  setup.data
                    .secret
                }
              </Text>
            </View>
          ) : null}

          {setup.data
            .provisioning_uri ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-coal-500">
                URI de configuración
              </Text>

              <Text
                selectable
                className="text-xs leading-5 text-coal-700"
              >
                {
                  setup.data
                    .provisioning_uri
                }
              </Text>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-sm font-semibold text-coal-900">
              Código de la aplicación
            </Text>

            <VerificationCodeInput
              value={code}
              onChange={
                setCode
              }
            />
          </View>

          <AppButton
            title="Activar autenticación"
            loading={
              confirm.isPending
            }
            onPress={
              confirmSetup
            }
          />
        </View>
      ) : null}

      {/* =====================================================
          ERRORES DE CONFIRMACIÓN
         ===================================================== */}

      {confirm.error ? (
        <Text
          accessibilityRole="alert"
          className="text-sm text-coal-900"
        >
          {confirm.error instanceof
          ApiError
            ? confirm.error
                .message
            : 'El código ingresado no es válido.'}
        </Text>
      ) : null}

      {/* =====================================================
          RECOVERY CODES
         ===================================================== */}

      {recoveryCodes.length >
      0 ? (
        <View className="gap-4 rounded-3xl border border-lumen-500/30 bg-bone-300 p-5">
          <View className="gap-1">
            <Text className="text-lg font-bold text-coal-900">
              Códigos de recuperación
            </Text>

            <Text className="text-sm leading-5 text-coal-500">
              Guarda estos códigos en un lugar seguro. Solo se muestran
              una vez y cada uno puede utilizarse una sola vez.
            </Text>
          </View>

          <View className="gap-2 rounded-2xl bg-lumen-300 p-4">
            {recoveryCodes.map(
              (
                recoveryCode,
              ) => (
                <Text
                  key={
                    recoveryCode
                  }
                  selectable
                  className="font-mono text-sm font-semibold text-coal-900"
                >
                  {
                    recoveryCode
                  }
                </Text>
              ),
            )}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}