import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ConfirmDialog } from '@/features/reminders/components/ConfirmDialog';
import { FamiliarCard } from '@/features/familiares/components/FamiliarCard';
import {
  useFamiliares,
  useRevokeFamiliar,
  useUpdateFamiliarPermiso,
} from '@/features/familiares/hooks/useFamiliares';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenApiError, FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { presentApiError } from '@/shared/api/api-error';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

/**
 * A11 -- Familiares Autorizados.
 */
export default function FamiliaresAutorizadosRoute() {
  const router = useRouter();
  const { activePatient } = useShellContext();
  const patientId = activePatient?.patientId ?? null;
  const { showFeedback } = useFeedback();

  const familiares = useFamiliares(patientId);
  const updatePermiso = useUpdateFamiliarPermiso(patientId);
  const revocar = useRevokeFamiliar(patientId);

  const [relacionARevocar, setRelacionARevocar] = useState<{ id: number; nombre: string } | null>(
    null,
  );

  function handleUpdateError(error: unknown) {
    const presented = presentApiError(error);
    showFeedback(presented.message, 'error', 'center');
  }

  function handleToggleNotificaciones(relacionId: number, value: boolean) {
    updatePermiso.mutate(
      { relacionId, recibirNotificaciones: value },
      { onError: handleUpdateError },
    );
  }

  function handleToggleNivelAcceso(relacionId: number, value: boolean) {
    updatePermiso.mutate(
      { relacionId, nivelAcceso: value ? 'write' : 'read' },
      { onError: handleUpdateError },
    );
  }

  function handleTogglePuedeVerExpediente(relacionId: number, value: boolean) {
    updatePermiso.mutate(
      { relacionId, puedeVerExpediente: value },
      { onError: handleUpdateError },
    );
  }

  function handleConfirmRevocar() {
    if (relacionARevocar === null) return;
    revocar.mutate(relacionARevocar.id, {
      onSuccess: () => {
        setRelacionARevocar(null);
        showFeedback('Acceso revocado.', 'success', 'center');
      },
      onError: (error) => {
        setRelacionARevocar(null);
        handleUpdateError(error);
      },
    });
  }

  if (patientId === null) {
    return (
      <FullScreenState
        title="Sin perfil de paciente"
        message="No encontramos un perfil de paciente activo."
      />
    );
  }

  if (familiares.isPending) {
    return (
      <FullScreenState
        title="Cargando familiares"
        message="Estamos consultando tu red de cuidado."
      />
    );
  }

  if (familiares.isError) {
    return <FullScreenApiError error={familiares.error} onRetry={() => void familiares.refetch()} />;
  }

  return (
    <Screen scrollable contentClassName="gap-4 px-4 py-4">
      <AppHeader title="Familiares" />

      <View className="gap-1">
        <Text className="text-2xl font-bold text-coal-900">Familiares Autorizados</Text>
        <Text className="text-sm text-coal-500">
          Gestiona quién tiene acceso a tu expediente y recibe alertas sobre tu salud.
        </Text>
      </View>

      <AppButton
          title="+ Añadir Familiar"
          variant="ghost"
          onPress={() => router.push('/(app)/familiares/agregar' as never)}
        />

      {familiares.relaciones.length === 0 ? (
        <View className="items-center gap-2 rounded-3xl bg-bone-100 p-6">
          <Text className="text-sm text-coal-500">
            Todavía no tienes familiares o cuidadores autorizados.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {familiares.relaciones.map((relacion) => (
            <FamiliarCard
              key={relacion.id}
              relacion={relacion}
              isUpdating={updatePermiso.isPending || revocar.isPending}
              onToggleNotificaciones={(value) => handleToggleNotificaciones(relacion.id, value)}
              onToggleNivelAcceso={(value) => handleToggleNivelAcceso(relacion.id, value)}
              onTogglePuedeVerExpediente={(value) =>
                handleTogglePuedeVerExpediente(relacion.id, value)
              }
              onRevocar={() =>
                setRelacionARevocar({
                  id: relacion.id,
                  nombre: relacion.usuario_relacionado?.full_name ?? 'este familiar',
                })
              }
            />
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={relacionARevocar !== null}
        title="Revocar acceso"
        message={`¿Seguro que quieres revocar el acceso de ${relacionARevocar?.nombre ?? ''}? Ya no podrá ver tu expediente ni recibir alertas.`}
        confirmLabel="Revocar"
        isSubmitting={revocar.isPending}
        onCancel={() => setRelacionARevocar(null)}
        onConfirm={handleConfirmRevocar}
      />
    </Screen>
  );
}
