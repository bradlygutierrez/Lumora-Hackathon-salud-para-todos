import { Ionicons } from '@expo/vector-icons';
import { Pressable, Switch, Text, View } from 'react-native';

import type { RelacionPacienteResponse } from '@/features/familiares/types/familiares.types';
import { theme } from '@/shared/theme/tokens';

type FamiliarCardProps = {
  relacion: RelacionPacienteResponse;
  isUpdating: boolean;
  onToggleNotificaciones: (value: boolean) => void;
  onToggleNivelAcceso: (value: boolean) => void;
  onRevocar: () => void;
};

/**
 * Tarjeta de un familiar/cuidador autorizado (A11).
 *
 * "Acceso a expediente completo" / "Solo información básica" es un solo
 * control (nivel_acceso: write/read) cuya etiqueta cambia según el
 * estado -- así se ve en el Figma, no son dos switches independientes.
 */
export function FamiliarCard({
  relacion,
  isUpdating,
  onToggleNotificaciones,
  onToggleNivelAcceso,
  onRevocar,
}: FamiliarCardProps) {
  const nombre = relacion.usuario_relacionado?.full_name ?? 'Familiar';
  const tipo = relacion.tipo_relacion?.nombre ?? 'Relación';
  const accesoCompleto = relacion.nivel_acceso === 'write';

  return (
    <View className="gap-3 rounded-3xl bg-bone-100 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-bone-300">
            <Ionicons name="person" size={20} color={theme.colors.textPrimary} />
          </View>
          <View>
            <Text className="text-base font-semibold text-coal-900">{nombre}</Text>
            <Text className="text-xs text-coal-500">{tipo}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Más opciones para ${nombre}`}
          hitSlop={12}
          disabled={isUpdating}
          onPress={onRevocar}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#505A61" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="notifications" size={16} color="#505A61" />
          <Text className="text-sm text-coal-900">Recibe alertas críticas</Text>
        </View>
        <Switch
          value={relacion.recibir_notificaciones}
          onValueChange={onToggleNotificaciones}
          disabled={isUpdating}
          trackColor={{ true: theme.colors.primary, false: '#D8DEE3' }}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={accesoCompleto ? 'folder-open' : 'folder'}
            size={16}
            color="#505A61"
          />
          <Text className="text-sm text-coal-900">
            {accesoCompleto ? 'Acceso a expediente completo' : 'Solo información básica'}
          </Text>
        </View>
        <Switch
          value={accesoCompleto}
          onValueChange={onToggleNivelAcceso}
          disabled={isUpdating}
          trackColor={{ true: theme.colors.primary, false: '#D8DEE3' }}
        />
      </View>
    </View>
  );
}
