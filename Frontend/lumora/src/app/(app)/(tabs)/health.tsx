import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/shared/components/Screen';
import { AppHeader } from '@/shared/components/AppHeader';
import { SurfaceCard } from '@/shared/components/SurfaceCard';

function TabPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View className={`rounded-full px-4 py-2 ${active ? 'bg-[#7CADDC]' : 'bg-[#eef3f6]'}`}>
      <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-coal-500'}`}>{label}</Text>
    </View>
  );
}

export default function HealthRoute() {
  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader
        title="Mi Salud"
        subtitle="Tu resumen de bienestar y registro personal."
        showNotification
      />

      <View className="gap-4 px-4 py-4">
        <View className="flex-row gap-2">
          <TabPill label="Resumen" active />
          <TabPill label="Indicadores" />
          <TabPill label="Condiciones" />
        </View>

        <SurfaceCard className="bg-[#fff0ef]">
          <View className="flex-row items-start" style={{ gap: 12 }}>
            <Ionicons name="warning" size={22} color="#BF3838" />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-[#BF3838]">Alergia Severa Registrada</Text>
              <Text className="mt-2 text-sm leading-5 text-coal-900">
                Recuerda que tienes una sensibilidad alta a la Penicilina y derivados.
                Mantén esta información visible para cualquier nuevo profesional de la salud.
              </Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-coal-900">Indicadores Clave</Text>
            <Ionicons name="add" size={18} color="#7CADDC" />
          </View>

          <View className="mt-4 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-coal-500">Presión Arterial</Text>
              <Text className="text-sm font-semibold text-coal-900">120/80 mmHg</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-coal-500">Frecuencia Cardíaca</Text>
              <Text className="text-sm font-semibold text-coal-900">72 bpm</Text>
            </View>
          </View>

          <Text className="mt-5 text-center text-sm font-medium text-[#7CADDC]">Ver histórico completo</Text>
        </SurfaceCard>

        <SurfaceCard>
          <Text className="text-xl font-semibold text-coal-900">Condiciones Activas</Text>

          <View className="mt-4 rounded-2xl bg-[#f7f8f8] p-4">
            <Text className="text-base font-semibold text-coal-900">Asma Leve</Text>
            <Text className="mt-1 text-xs leading-4 text-coal-500">
              Diagnosticado en 2018. Controlado con inhalador preventivo.
            </Text>
          </View>
        </SurfaceCard>

        <View className="rounded-3xl bg-[#4A86B6] p-5">
          <Text className="text-xs text-white/80">Próximo Evento</Text>
          <Text className="mt-3 text-2xl font-semibold text-white">Revisión General</Text>
          <Text className="mt-2 text-sm text-white/90">Dra. Elena Silva (Medicina Interna)</Text>
          <Text className="mt-4 text-sm text-white">15 Octubre, 10:30 AM</Text>
          <Text className="mt-2 text-sm text-white">Clínica Centro, Sala 4B</Text>

          <View className="mt-5 rounded-2xl bg-white px-4 py-3">
            <Text className="text-center text-sm font-semibold text-[#4A86B6]">Preparar mi visita →</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
