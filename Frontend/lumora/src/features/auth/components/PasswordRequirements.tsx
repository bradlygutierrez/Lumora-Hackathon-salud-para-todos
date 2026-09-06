import { Text, View } from 'react-native';

type PasswordRequirementsProps = {
  value: string;
};

/** Feedback visual de la política que también valida FastAPI. */
export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  const rules: Array<[label: string, valid: boolean]> = [
    ['8+ caracteres', value.length >= 8],
    ['Mayúscula', /[A-Z]/.test(value)],
    ['Minúscula', /[a-z]/.test(value)],
    ['Número', /\d/.test(value)],
    ['Símbolo', /[^A-Za-z0-9]/.test(value)],
  ];

  return (
    <View className="gap-1">
      {rules.map(([label, valid]) => (
        <Text
          key={label}
          className={`text-xs ${valid ? 'text-coal-900' : 'text-coal-500'}`}
        >
          {valid ? '✓' : '○'} {label}
        </Text>
      ))}
    </View>
  );
}
