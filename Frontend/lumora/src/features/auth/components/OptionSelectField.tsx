import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export type SelectOption = {
  label: string;
  value: number;
};

type OptionSelectFieldProps = {
  label: string;
  value: number | null;
  options: SelectOption[];
  onChange: (value: number | null) => void;
  optional?: boolean;
};

/**
 * Selector sin dependencias nativas adicionales.
 *
 * Usa Modal + Pressable para que B08 pueda seleccionar catálogos reales sin
 * introducir otra librería de picker en medio del sprint.
 */
export function OptionSelectField({
  label,
  value,
  options,
  onChange,
  optional = false,
}: OptionSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const choose = (nextValue: number | null) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-coal-900">{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="min-h-12 justify-center rounded-xl border border-lumen-500 bg-bone-300 px-4"
      >
        <Text className={selected ? 'text-coal-900' : 'text-coal-500'}>
          {selected?.label ?? (optional ? 'Opcional' : 'Seleccionar')}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/30"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-[55%] rounded-t-3xl bg-bone-100 p-5"
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="mb-3 text-xl font-bold text-coal-900">
              {label}
            </Text>

            <ScrollView>
              {optional ? (
                <Pressable className="py-4" onPress={() => choose(null)}>
                  <Text className="text-base text-coal-700">Sin especificar</Text>
                </Pressable>
              ) : null}

              {options.map((option) => (
                <Pressable
                  key={option.value}
                  className="border-b border-bone-500 py-4"
                  onPress={() => choose(option.value)}
                >
                  <Text className="text-base text-coal-900">
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
