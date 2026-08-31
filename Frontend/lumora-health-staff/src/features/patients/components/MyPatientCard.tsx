import { Ionicons } from '@expo/vector-icons';
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
  const first = item.paciente.persona.nombres.slice(0, 1);
  const last = item.paciente.persona.apellidos.slice(0, 1);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.heading}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {first}
            {last}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>
            {fullPatientName(
              item.paciente.persona.nombres,
              item.paciente.persona.apellidos,
            )}
          </Text>
          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Paciente vinculado</Text>
          </View>
        </View>
        <Ionicons
          color={theme.color.primary}
          name="chevron-forward"
          size={20}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons
            color={theme.color.primaryPressed}
            name="calendar-outline"
            size={17}
          />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.label}>Próxima cita</Text>
          <Text style={styles.value}>
            {formatWorkspaceDateTime(item.proxima_cita?.inicio)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons
            color={theme.color.primaryPressed}
            name="time-outline"
            size={17}
          />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.label}>Última consulta</Text>
          <Text style={styles.value}>
            {formatDate(item.ultima_consulta?.fecha_consulta)}
          </Text>
        </View>
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
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  pressed: {
    opacity: 0.76,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  avatarText: {
    color: theme.color.info,
    fontSize: 18,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.color.text,
    fontSize: 19,
    fontWeight: '900',
  },
  status: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.successSoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusDot: {
    backgroundColor: theme.color.success,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusText: {
    color: theme.color.success,
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: theme.color.softBorder,
    height: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: theme.color.subtleText,
    fontSize: 11,
    fontWeight: '800',
  },
  value: {
    color: theme.color.text,
    fontSize: 13,
  },
  link: {
    color: theme.color.primary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
});
