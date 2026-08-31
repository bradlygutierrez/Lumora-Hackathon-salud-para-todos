import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/shared/constants/theme';
import type { Patient } from '../types/patient.types';
import { fullPatientName, patientAge } from '../utils/patient-format';

type Props = {
  patient: Patient;
  sexName?: string;
  bloodTypeName?: string;
  onPress: () => void;
};

export function PatientCard({
  bloodTypeName,
  onPress,
  patient,
  sexName,
}: Props) {
  const age = patientAge(patient.persona.fecha_nacimiento);

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
            {patient.persona.nombres.slice(0, 1)}
            {patient.persona.apellidos.slice(0, 1)}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>
            {fullPatientName(
              patient.persona.nombres,
              patient.persona.apellidos,
            )}
          </Text>
          <Text style={styles.meta}>
            {age !== null ? `Edad: ${age}` : 'Edad no indicada'}
            {sexName ? ` · ${sexName}` : ''}
          </Text>
          {bloodTypeName ? (
            <View style={styles.badge}>
              <Ionicons
                color={theme.color.primaryPressed}
                name="water-outline"
                size={13}
              />
              <Text style={styles.badgeText}>{bloodTypeName}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.contactRow}>
        <Ionicons
          color={theme.color.primary}
          name="call-outline"
          size={18}
        />
        <Text style={styles.contact}>
          {patient.persona.telefono ?? 'Sin teléfono'}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.link}>Ver ficha</Text>
        <Ionicons
          color={theme.color.primary}
          name="arrow-forward"
          size={18}
        />
      </View>
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
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: theme.color.info,
    fontSize: 19,
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
  meta: {
    color: theme.color.mutedText,
    fontSize: 13,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: theme.color.primaryPressed,
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: theme.color.softBorder,
    height: 1,
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  contact: {
    color: theme.color.mutedText,
    fontSize: 13,
  },
  spacer: {
    flex: 1,
  },
  link: {
    color: theme.color.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
