import {
  useLocalSearchParams,
} from 'expo-router';

import {
  RescheduleAppointmentScreen,
} from '@/features/appointments/screens/RescheduleAppointmentScreen';

export default function RescheduleAppointmentRoute() {
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
    <RescheduleAppointmentScreen
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
