import { useLocalSearchParams } from 'expo-router';

import { AppointmentDetailScreen } from '@/src/features/appointments/screens/AppointmentDetailScreen';

export default function AppointmentDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const appointmentId = Number(params.id);
  return <AppointmentDetailScreen appointmentId={appointmentId} />;
}
