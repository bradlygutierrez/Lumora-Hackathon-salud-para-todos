import {
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  normalizeAppointmentText,
} from '@/features/appointments/utils/appointments';

type StatusStyle = {
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function statusStyle(
  status: string,
): StatusStyle {
  switch (
    normalizeAppointmentText(
      status,
    )
  ) {
    case 'confirmada':
      return {
        backgroundColor:
          '#DDF4EE',
        color:
          '#196B59',
        icon: 'checkmark-circle',
      };

    case 'pendiente':
      return {
        backgroundColor:
          '#E7F2F1',
        color:
          '#54726D',
        icon: 'time-outline',
      };

    case 'cancelada':
      return {
        backgroundColor:
          '#FDE7E7',
        color:
          '#B42318',
        icon: 'close-circle',
      };

    case 'completada':
      return {
        backgroundColor:
          '#E8EDF2',
        color:
          '#425466',
        icon: 'checkmark-done-circle',
      };

    default:
      return {
        backgroundColor:
          '#E8F1F7',
        color:
          '#4A86B6',
        icon: 'information-circle',
      };
  }
}

export function AppointmentStatusBadge({
  status,
}: {
  status: string;
}) {
  const style =
    statusStyle(
      status,
    );

  return (
    <View
      accessibilityLabel={`Estado de la cita: ${status}`}
      className="flex-row items-center gap-1 self-start rounded-full px-3 py-1.5"
      style={{
        backgroundColor:
          style.backgroundColor,
      }}
    >
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text
        className="text-xs font-semibold"
        style={{
          color:
            style.color,
        }}
      >
        {status}
      </Text>
    </View>
  );
}
