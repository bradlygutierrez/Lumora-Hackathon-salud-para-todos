import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  useBuscarUsuarioPorEmail,
  useCrearFamiliar,
  useTipoRelacionCatalog,
} from '@/features/familiares/hooks/useFamiliares';
import type { UsuarioRelacionadoSummary } from '@/features/familiares/types/familiares.types';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { presentApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { AppTextInput } from '@/shared/components/AppTextInput';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

/**
 * "+ Añadir Familiar" (A11).
 *
 * Flujo en dos pasos, sobre el mismo formulario:
 *  1) Buscar por correo -- GET /reminders/usuarios/buscar. Si no existe
 *     cuenta con ese correo, se lo decimos claro (no hay invitación por
 *     correo externo todavía, solo se puede enlazar a alguien que ya
 *     tenga cuenta en Lumora).
 *  2) Con la persona encontrada, elegir el tipo de relación y confirmar
 *     -- POST /reminders/pacientes/{id}/relaciones.
 */
export default function AgregarFamiliarRoute() {
  const router = useRouter();
  const { activePatient } = useShellContext();
  const patientId = activePatient?.patientId ?? null;
  const { showFeedback } = useFeedback();

  const [email, setEmail] = useState('');
  const [encontrado, setEncontrado] = useState<UsuarioRelacionadoSummary | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tipoRelacionId, setTipoRelacionId] = useState<number | null>(null);

  const tiposRelacion = useTipoRelacionCatalog();
  const buscar = useBuscarUsuarioPorEmail();
  const crear = useCrearFamiliar(patientId);

  function handleBuscar() {
    const correo = email.trim();
    if (!correo) return;

    setSearchError(null);
    setEncontrado(null);
    setTipoRelacionId(null);

    buscar.mutate(correo, {
      onSuccess: (usuario) => setEncontrado(usuario),
      onError: (error) => {
        const presented = presentApiError(error);
        setSearchError(
          presented.kind === 'not-found'
            ? 'No encontramos a nadie con ese correo. Solo puedes añadir a alguien que ya tenga cuenta en Lumora.'
            : presented.message,
        );
      },
    });
  }

  function handleInvitar() {
    if (encontrado === null || tipoRelacionId === null || patientId === null) return;

    crear.mutate(
      { usuarioRelacionadoId: encontrado.id, tipoRelacionId },
      {
        onSuccess: () => {
          showFeedback(`${encontrado.full_name} fue añadido a tu red de cuidado.`, 'success', 'center');
          router.back();
        },
        onError: (error) => {
          const presented = presentApiError(error);
          showFeedback(presented.message, 'error', 'center');
        },
      },
    );
  }

  return (
    <Screen scrollable keyboardAvoiding contentClassName="gap-5 px-4 py-4">
      <AppHeader title="Añadir Familiar" />

      <View className="gap-1">
        <Text className="text-2xl font-bold text-coal-900">Buscar por correo</Text>
        <Text className="text-sm text-coal-500">
          Solo puedes añadir a alguien que ya tenga una cuenta en Lumora.
        </Text>
      </View>

      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <AppTextInput
            label="Correo electrónico"
            placeholder="familiar@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setSearchError(null);
              setEncontrado(null);
            }}
            error={searchError ?? undefined}
          />
        </View>
        <AppButton
          title={buscar.isPending ? 'Buscando…' : 'Buscar'}
          variant="ghost"
          disabled={!email.trim() || buscar.isPending}
          onPress={handleBuscar}
        />
      </View>

      {encontrado ? (
        <View className="gap-4 rounded-3xl bg-bone-100 p-4">
          <View>
            <Text className="text-base font-semibold text-coal-900">{encontrado.full_name}</Text>
            <Text className="text-xs text-coal-500">{encontrado.email}</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-coal-900">Tipo de relación</Text>

            {tiposRelacion.isPending ? (
              <Text className="text-xs text-coal-500">Cargando catálogo…</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {(tiposRelacion.data?.items ?? []).map((tipo) => {
                  const selected = tipoRelacionId === tipo.id;
                  return (
                    <Pressable
                      key={tipo.id}
                      accessibilityRole="radio"
                      accessibilityLabel={tipo.nombre}
                      accessibilityState={{ selected }}
                      onPress={() => setTipoRelacionId(tipo.id)}
                      className={`rounded-full px-4 py-2 ${
                        selected ? 'bg-lumen-500' : 'bg-bone-300'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selected ? 'text-coal-900' : 'text-coal-500'
                        }`}
                      >
                        {tipo.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <AppButton
            title={crear.isPending ? 'Añadiendo…' : 'Añadir a mi red de cuidado'}
            disabled={tipoRelacionId === null || crear.isPending}
            loading={crear.isPending}
            onPress={handleInvitar}
          />
        </View>
      ) : null}
    </Screen>
  );
}
