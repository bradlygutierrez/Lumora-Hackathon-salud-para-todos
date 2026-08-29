import {
  useLocalSearchParams,
} from 'expo-router';

import {
  AppointmentConfirmationScreen,
} from '@/features/appointments/screens/AppointmentConfirmationScreen';

export default function AppointmentConfirmationRoute() {
  const {
    appointmentId,
  } =
    useLocalSearchParams<{
      appointmentId:
        string;
    }>();

  const parsed =
    Number(
      appointmentId,
    );

  return (
    <AppointmentConfirmationScreen
      appointmentId={
        Number.isInteger(
          parsed,
        ) &&
        parsed > 0
          ? parsed
          : null
      }
    />
  );
}
