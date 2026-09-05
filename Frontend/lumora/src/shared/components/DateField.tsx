import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  error?: string;
  mode?: 'date' | 'datetime';
};

function display(value: string | null | undefined, mode: Props['mode']) {
  if (!value) return 'Seleccionar fecha';
  const date = new Date(value);
  return mode === 'datetime'
    ? date.toLocaleString('es-NI')
    : date.toLocaleDateString('es-NI');
}

export function DateField({ label, value, onChange, error, mode = 'date' }: Props) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(value) : new Date();
  const handleChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (!selected) return;
    onChange(mode === 'date' ? [selected.getFullYear(), String(selected.getMonth() + 1).padStart(2, '0'), String(selected.getDate()).padStart(2, '0')].join('-') : selected.toISOString());
  };
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>{display(value, mode)}</Text>
      </Pressable>
      {open ? <DateTimePicker value={current} mode={mode} display="default" onChange={handleChange} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { color: '#344054', fontSize: 13, fontWeight: '700' },
  field: { borderColor: '#D0D5DD', borderRadius: 12, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  value: { color: '#101828', fontSize: 15 },
  placeholder: { color: '#98A2B3', fontSize: 15 },
  error: { color: '#D92D20', fontSize: 12 },
});
