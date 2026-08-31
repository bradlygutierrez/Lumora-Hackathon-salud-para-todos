import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  canManagePatientData,
  permisoNivel,
  permisoNivelLabel,
} from '@/features/caregiver-access/utils/caregiver-permissions';
import { useMyCaregiverRelacion } from '@/features/caregiver-access/hooks/useMyCaregiverRelacion';
import { useHomeHealthDashboard } from '@/features/home-health/hooks/useHomeHealthDashboard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenApiError, FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

/**
 * A13 -- "Permisos y Contactos": lo que un cuidador puede ver de su
 * propio nivel de acceso sobre el paciente activo, y el equipo médico
 * de ese paciente.
 *
 * Las 4 filas de "Autorizaciones de Cuidador" se derivan de los dos
 * únicos permisos reales que existen en el backend (ver el comentario
 * en `caregiver-permissions.ts`). "Equipo Médico Principal" se deriva
 * del profesional de la próxima (o última) cita, porque el backend no
 * modela un "médico principal" por paciente.
 */
export default function PermisosContactosRoute() {
  const { activePatient, currentUserId } = useShellContext();
  const { showFeedback } = useFeedback();
  const patientId = activePatient?.patientId ?? null;

  const relacionQuery = useMyCaregiverRelacion(patientId, currentUserId);
  const dashboard = useHomeHealthDashboard(patientId);

  function handleContactoNoDisponible() {
    showFeedback(
      'Todavía no hay un número o correo de contacto registrado para este profesional.',
      'info',
      'center',
    );
  }

  function handleSolicitarCambio() {
    showFeedback(
      'Pídele al paciente que actualice tus permisos desde su pantalla de Familiares Autorizados.',
      'info',
      'center',
    );
  }

  if (patientId === null) {
    return (
      <FullScreenState
        title="Sin perfil de paciente"
        message="No encontramos un paciente activo."
      />
    );
  }

  if (relacionQuery.isPending || dashboard.isPending) {
    return (
      <FullScreenState
        title="Cargando permisos"
        message="Estamos consultando tus autorizaciones."
      />
    );
  }

  if (relacionQuery.isError) {
    return (
      <FullScreenApiError
        error={relacionQuery.error}
        onRetry={() => void relacionQuery.refetch()}
      />
    );
  }

  if (dashboard.isError) {
    return (
      <FullScreenApiError
        error={dashboard.error}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const relacion = relacionQuery.relacion;
  const nivel = permisoNivel(relacion?.nivel_acceso ?? null);
  const puedeGestionar = canManagePatientData(relacion?.nivel_acceso ?? null);
  const recibeAlertas = relacion?.recibir_notificaciones ?? false;

  const nextAppointment = dashboard.data?.appointments[0] ?? null;
  const professional = nextAppointment?.professional ?? null;

  return (
    <Screen scrollable contentClassName="gap-4 px-4 py-4">
      <AppHeader title="Permisos y Contactos" showNotification />

      <View className="gap-1">
        <Text className="text-sm text-coal-500">
          Gestionando cuidados para {activePatient?.displayName ?? 'este paciente'}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/select-patient' as never)}
          className="mt-1 self-start"
        >
          <Text className="text-sm font-semibold text-[#4A86B6]">⇄ Cambiar Paciente</Text>
        </Pressable>
      </View>

      <SurfaceCard>
        <Text className="text-lg font-semibold text-coal-900">Autorizaciones de Cuidador</Text>

        <View className="mt-4 gap-4">
          <PermisoRow
            label="Expediente médico"
            value={permisoNivelLabel(nivel)}
          />
          <PermisoRow
            label="Recibe alertas críticas"
            value={recibeAlertas ? 'Sí' : 'No'}
          />
          <PermisoRow
            label="Medicación"
            value={permisoNivelLabel(nivel)}
          />
          <PermisoRow
            label="Citas"
            value={permisoNivelLabel(nivel)}
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleSolicitarCambio}
            className="flex-row items-center justify-between border-t border-coal-500/10 pt-4"
          >
            <Text className="text-sm font-semibold text-[#4A86B6]">
              Solicitar cambio de acceso
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#4A86B6" />
          </Pressable>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text className="text-lg font-semibold text-coal-900">Equipo Médico Principal</Text>

        {professional ? (
          <View className="mt-4 gap-3">
            <View>
              <Text className="text-base font-semibold text-coal-900">
                {professional.full_name}
              </Text>
              <Text className="text-sm text-coal-500">{professional.specialty}</Text>
            </View>

            <View className="flex-row gap-3">
              <ContactButton
                icon="call-outline"
                label="Llamar a Consulta"
                onPress={handleContactoNoDisponible}
              />
              <ContactButton
                icon="mail-outline"
                label="Enviar Mensaje"
                onPress={handleContactoNoDisponible}
              />
            </View>
          </View>
        ) : (
          <Text className="mt-4 text-sm text-coal-500">
            Todavía no hay un profesional asociado a una cita de este paciente.
          </Text>
        )}
      </SurfaceCard>
    </Screen>
  );
}

function PermisoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-coal-900">{label}</Text>
      <Text className="text-sm text-coal-500">{value}</Text>
    </View>
  );
}

function ContactButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#78AEDD] px-3 active:opacity-75"
    >
      <Ionicons name={icon} size={16} color="#4A86B6" />
      <Text className="text-sm font-semibold text-[#4A86B6]">{label}</Text>
    </Pressable>
  );
}
