import { useState } from 'react';
import { Pressable, Text, View, type TextInputProps } from 'react-native';

import { AppTextInput } from '@/shared/components/AppTextInput';

type PasswordFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
};

/**
 * Input de contraseña con toggle de visibilidad.
 *
 * React Native no trae un input específico para password: se usa TextInput
 * con `secureTextEntry` y se alterna su valor desde aquí.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="gap-1">
      <AppTextInput {...props} secureTextEntry={!visible} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible((value) => !value)}
        className="min-h-11 self-end justify-center px-2"
      >
        <Text className="text-sm font-medium text-coal-700">
          {visible ? 'Ocultar' : 'Mostrar'} contraseña
        </Text>
      </Pressable>
    </View>
  );
}
