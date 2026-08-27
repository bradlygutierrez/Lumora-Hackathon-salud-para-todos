import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Input lógico único que se presenta visualmente como seis casillas.
 * Evita administrar seis refs y seis estados independientes.
 */
export function VerificationCodeInput({
  value,
  onChange,
}: VerificationCodeInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Código de seis dígitos"
      onPress={() => inputRef.current?.focus()}
    >
      <View className="flex-row justify-between gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <View
            key={index}
            className="h-14 flex-1 items-center justify-center rounded-xl border border-lumen-500 bg-bone-300"
          >
            <Text className="text-xl font-semibold text-coal-900">
              {value[index] ?? ''}
            </Text>
          </View>
        ))}
      </View>

      <TextInput
        ref={inputRef}
        accessibilityLabel="Ingresar código"
        value={value}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(text) =>
          onChange(text.replace(/\D/g, '').slice(0, 6))
        }
        className="absolute h-1 w-1 opacity-0"
      />
    </Pressable>
  );
}
