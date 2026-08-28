import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/shared/components/Screen';
import { AppHeader } from '@/shared/components/AppHeader';
import { SurfaceCard } from '@/shared/components/SurfaceCard';

type AppointmentCardProps = {
  status: string;
  doctor: string;
  specialty: string;
  date: string;
  location: string;
  secondaryAction: string;
};

function AppointmentCard({
  status,
  doctor,
  specialty,
  date,
  location,
  secondaryAction,
}: AppointmentCardProps) {
  return (
    <SurfaceCard>
      <View className="mb-4 flex-row items-center justify-between">
        <View className="rounded-full bg-[#dbeaf7] px-3 py-1">
          <Text className="text-xs font-medium text-[#4A86B6]">{status}</Text>
        </View>
        <Text className="text-coal-500">⋮</Text>
      </View>

      <Text className="text-xl font-semibold text-coal-900">{doctor}</Text>
      <Text className="mt-1 text-sm text-coal-500">{specialty}</Text>

      <View className="mt-4 gap-2">
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Ionicons name="calendar-outline" size={16} color="#7B848B" />
          <Text className="text-sm text-coal-900">{date}</Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Ionicons name="location-outline" size={16} color="#7B848B" />
          <Text className="text-sm text-coal-900">{location}</Text>
        </View>
      </View>

      <View className="mt-5 flex-row" style={{ gap: 10 }}>
        <Pressable className="flex-1 rounded-xl bg-[#eef3f6] px-3 py-3 active:opacity-80">
          <Text className="text-center text-sm font-medium text-coal-900">Reprogramar</Text>
        </Pressable>

        <Pressable className="flex-1 rounded-xl border border-coal-500/20 bg-white px-3 py-3 active:opacity-80">
          <Text className="text-center text-sm font-medium text-coal-900">{secondaryAction}</Text>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

export default function AppointmentsRoute() {
  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader
        title="Tus Citas"
        subtitle="Gestiona tus próximas consultas y revisa tu historial."
        showNotification
      />

      <View className="gap-4 px-4 py-4">
        <Pressable className="self-start rounded-full bg-[#78AEDD] px-4 py-3 active:opacity-80">
          <Text className="text-sm font-semibold text-white">+ Solicitar nueva cita</Text>
        </Pressable>

        <View className="flex-row gap-6 border-b border-coal-500/10 pb-3">
          <Text className="text-base font-semibold text-[#78AEDD]">Próximas</Text>
          <Text className="text-base font-semibold text-coal-500">Anteriores</Text>
        </View>

        <AppointmentCard
          status="Confirmada"
          doctor="Dr. Carlos Pérez"
          specialty="Cardiología"
          date="15 de Octubre, 2024 10:00 AM"
          location="Consultorio 302"
          secondaryAction="Detalles"
        />

        <AppointmentCard
          status="Pendiente"
          doctor="Dra. Ana López"
          specialty="Dermatología"
          date="22 de Octubre, 2024 04:30 PM"
          location="Virtual"
          secondaryAction="Cancelar"
        />

        <SurfaceCard className="items-center bg-[#f7f8f8] py-8">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <Ionicons name="calendar-outline" size={24} color="#78AEDD" />
          </View>
          <Text className="mt-5 text-xl font-semibold text-coal-900">No tienes más citas próximas</Text>
          <Text className="mt-2 max-w-[260px] text-center text-sm leading-5 text-coal-500">
            Mantén tu salud al día programando tus chequeos preventivos.
          </Text>
          <Text className="mt-4 text-sm font-medium text-[#78AEDD]">Ver doctores disponibles</Text>
        </SurfaceCard>
      </View>
    </Screen>
  );
}
