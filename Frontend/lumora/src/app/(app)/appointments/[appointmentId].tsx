import {
  useLocalSearchParams,
} from 'expo-router';

import {
  AppointmentDetailScreen,
} from '@/features/appointments/screens/AppointmentDetailScreen';

function parseId(
  value:
    | string
    | string[]
    | undefined,
): number | null {
  const raw =
    Array.isArray(
      value,
    )
      ? value[0]
      : value;

  const parsed =
    raw
      ? Number(
          raw,
        )
      : NaN;

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : null;
}

export default function AppointmentDetailRoute() {
  const {
    appointmentId,
  } =
    useLocalSearchParams<{
      appointmentId:
        string;
    }>();

  return (
    <AppointmentDetailScreen
      appointmentId={
        parseId(
          appointmentId,
        )
      }
    />
  );
}
