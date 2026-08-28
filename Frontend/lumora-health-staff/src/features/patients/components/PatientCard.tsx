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

export function PatientCard({ patient, sexName, bloodTypeName, onPress }: Props) {
  const age = patientAge(patient.persona.fecha_nacimiento);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient.persona.nombres.slice(0, 1)}{patient.persona.apellidos.slice(0, 1)}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{fullPatientName(patient.persona.nombres, patient.persona.apellidos)}</Text>
          <Text style={styles.meta}>
            {age !== null ? `${age} años` : 'Edad no indicada'}
            {sexName ? ` · ${sexName}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.detailRow}>
        <Ionicons color={theme.color.primary} name="call-outline" size={18} />
        <Text style={styles.detail}>{patient.persona.telefono ?? 'Sin teléfono'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons color={theme.color.primary} name="water-outline" size={18} />
        <Text style={styles.detail}>{bloodTypeName ? `Sangre ${bloodTypeName}` : 'Tipo de sangre no indicado'}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.link}>Ver ficha</Text>
        <Ionicons color={theme.color.primary} name="arrow-forward" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: theme.color.info, fontSize: 16, fontWeight: '900' },
  identity: { flex: 1, gap: 2 },
  name: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  meta: { color: theme.color.mutedText, fontSize: theme.typography.caption },
  divider: { backgroundColor: theme.color.softBorder, height: 1, marginVertical: theme.spacing.xs },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  detail: { color: theme.color.mutedText, flex: 1, fontSize: theme.typography.caption },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm },
  link: { color: theme.color.primary, fontSize: theme.typography.caption, fontWeight: '800' },
});
