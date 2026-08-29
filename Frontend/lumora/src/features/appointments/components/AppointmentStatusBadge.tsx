import {
  Text,
  View,
} from 'react-native';

import {
  normalizeAppointmentText,
} from '@/features/appointments/utils/appointments';

type StatusStyle = {
  backgroundColor: string;
  color: string;
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
      };

    case 'pendiente':
      return {
        backgroundColor:
          '#E7F2F1',
        color:
          '#54726D',
      };

    case 'cancelada':
      return {
        backgroundColor:
          '#FDE7E7',
        color:
          '#B42318',
      };

    case 'completada':
      return {
        backgroundColor:
          '#E8EDF2',
        color:
          '#425466',
      };

    default:
      return {
        backgroundColor:
          '#E8F1F7',
        color:
          '#4A86B6',
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
      className="self-start rounded-full px-3 py-1.5"
      style={{
        backgroundColor:
          style.backgroundColor,
      }}
    >
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
