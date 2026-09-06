import { Text, View } from 'react-native';

import { Screen } from '@/shared/components/Screen';

type FeaturePlaceholderProps = {
  title: string;
  description: string;
};

/** Placeholder temporal para rutas que pertenecen a cards posteriores. */
export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <Screen>
      <View className="rounded-2xl bg-lumen-300 p-6">
        <Text className="text-2xl font-bold text-coal-900">{title}</Text>
        <Text className="mt-2 text-base leading-6 text-coal-500">
          {description}
        </Text>
      </View>
    </Screen>
  );
}
