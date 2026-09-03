import { Text, View } from 'react-native';

type RegistrationStep = 1 | 2 | 3 | 4;
type RegistrationTotal = 3 | 4;

export function RegistrationProgress({
  step,
  total = 4,
}: {
  step: RegistrationStep;
  total?: RegistrationTotal;
}) {
  const visibleStep = Math.min(step, total);

  return (
    <View
      className="gap-2"
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: total,
        now: visibleStep,
      }}
    >
      <Text className="text-sm font-medium text-coal-500">
        Paso {visibleStep} de {total}
      </Text>

      <View className="h-2 flex-row gap-1" accessibilityElementsHidden>
        {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
          <View
            key={item}
            className={`flex-1 rounded-full ${
              item <= visibleStep ? 'bg-lumen-500' : 'bg-bone-500'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
