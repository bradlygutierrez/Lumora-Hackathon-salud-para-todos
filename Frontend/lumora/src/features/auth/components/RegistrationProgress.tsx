import { Text, View } from 'react-native';

type RegistrationStep = 1 | 2 | 3 | 4;

/** Indicador visual de los cuatro pasos del registro paciente. */
export function RegistrationProgress({ step }: { step: RegistrationStep }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-coal-500">Paso {step} de 4</Text>

      <View className="h-2 flex-row gap-1">
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            className={`flex-1 rounded-full ${
              item <= step ? 'bg-lumen-500' : 'bg-bone-500'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
