import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatWorkspaceDateTime } from '@/src/features/appointments/utils/workspace-date-time';

import { theme } from '@/src/shared/constants/theme';
import type { MyPatient } from '../types/my-patient.types';
import { fullPatientName } from '../utils/patient-format';

function formatDate(value: string | null | undefined) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function MyPatientCard({
  item,
  onPress,
}: {
  item: MyPatient;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <Text style={styles.name}>
        {fullPatientName(item.paciente.persona.nombres, item.paciente.persona.apellidos)}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Próxima cita</Text>
        <Text style={styles.value}>{formatWorkspaceDateTime(item.proxima_cita?.inicio)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Última consulta</Text>
        <Text style={styles.value}>{formatDate(item.ultima_consulta?.fecha_consulta)}</Text>
      </View>
      <Text style={styles.link}>Ver ficha</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  name: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  row: { gap: 2 },
  label: { color: theme.color.subtleText, fontSize: 12, fontWeight: '700' },
  value: { color: theme.color.text, fontSize: 14 },
  link: { color: theme.color.primary, fontSize: 13, fontWeight: '800', textAlign: 'right' },
});
