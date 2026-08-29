import {
  useLocalSearchParams,
} from 'expo-router';

import {
  CancelAppointmentScreen,
} from '@/features/appointments/screens/CancelAppointmentScreen';

export default function CancelAppointmentRoute() {
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
    <CancelAppointmentScreen
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
