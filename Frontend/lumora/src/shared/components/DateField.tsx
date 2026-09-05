import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
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

function toValue(mode: Props['mode'], selected: Date): string {
  return mode === 'date'
    ? [
        selected.getFullYear(),
        String(selected.getMonth() + 1).padStart(2, '0'),
        String(selected.getDate()).padStart(2, '0'),
      ].join('-')
    : selected.toISOString();
}

function combineDateAndTime(date: Date, time: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
  );
}

/**
 * En Android, @react-native-community/datetimepicker es un diálogo
 * imperativo, no un componente para montar condicionalmente -- hacerlo así
 * (como sí funciona en iOS) rompe la app al desmontarlo con "Cannot read
 * property 'dismiss' of undefined". Acá hay que usar DateTimePickerAndroid.
 * Android tampoco tiene un modo "datetime" nativo: para eso se encadenan
 * el diálogo de fecha y el de hora, y se combinan los dos resultados.
 */
function openAndroidPicker(current: Date, mode: Props['mode'], onPicked: (value: Date) => void) {
  DateTimePickerAndroid.open({
    value: current,
    mode: 'date',
    display: 'default',
    onChange: (_event, pickedDate) => {
      if (!pickedDate) return;
      if (mode !== 'datetime') {
        onPicked(pickedDate);
        return;
      }
      DateTimePickerAndroid.open({
        value: current,
        mode: 'time',
        display: 'default',
        onChange: (_timeEvent, pickedTime) => {
          if (!pickedTime) return;
          onPicked(combineDateAndTime(pickedDate, pickedTime));
        },
      });
    },
  });
}

export function DateField({ label, value, onChange, error, mode = 'date' }: Props) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(value) : new Date();

  const openPicker = () => {
    if (Platform.OS === 'android') {
      openAndroidPicker(current, mode, (selected) => onChange(toValue(mode, selected)));
      return;
    }
    setOpen(true);
  };

  const handleChangeIOS = (_event: unknown, selected?: Date) => {
    setOpen(false);
    if (!selected) return;
    onChange(toValue(mode, selected));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={openPicker} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>{display(value, mode)}</Text>
      </Pressable>
      {open && Platform.OS !== 'android' ? (
        <DateTimePicker value={current} mode={mode} display="default" onChange={handleChangeIOS} />
      ) : null}
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
