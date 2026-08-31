import { useLocalSearchParams, useRouter } from 'expo-router';

import { MeasurementHistoryScreen } from '@/src/features/measurements/screens/MeasurementHistoryScreen';

export default function PatientMeasurementsRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const patientId = Number(params.id);

  return (
    <MeasurementHistoryScreen
      onBack={() => router.back()}
      patientId={patientId}
    />
  );
}
