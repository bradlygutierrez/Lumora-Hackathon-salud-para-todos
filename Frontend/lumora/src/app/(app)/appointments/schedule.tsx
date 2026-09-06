import {
  useLocalSearchParams,
} from 'expo-router';

import {
  ScheduleAppointmentScreen,
} from '@/features/appointments/screens/ScheduleAppointmentScreen';

export default function ScheduleAppointmentRoute() {
  const {
    professionalId,
  } =
    useLocalSearchParams<{
      professionalId:
        string;
    }>();

  const parsed =
    Number(
      professionalId,
    );

  return (
    <ScheduleAppointmentScreen
      professionalId={
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
