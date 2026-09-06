import {
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

type ClinicalAlertCardProps = {
  title: string;
  message: string;
  badge?: string | null;
};

/** Alerta prioritaria de Inicio/Mi Salud. */
export function ClinicalAlertCard({
  title,
  message,
  badge,
}: ClinicalAlertCardProps) {
  return (
    <View className="rounded-3xl border border-[#F4CACA] bg-[#FFF0EF] p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
          <Ionicons name="warning" size={19} color="#BF3838" />
        </View>

        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-bold text-[#B52F2F]">{title}</Text>

            {badge ? (
              <View className="rounded-full bg-white px-2 py-1">
                <Text className="text-[10px] font-semibold text-[#B52F2F]">
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-2 text-sm leading-5 text-coal-900">
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}
