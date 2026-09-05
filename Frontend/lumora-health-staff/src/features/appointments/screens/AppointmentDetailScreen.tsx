import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { usePatient } from '@/src/features/patients/hooks/use-patients';
import { fullPatientName } from '@/src/features/patients/utils/patient-format';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { useAppointment } from '../hooks/use-appointments';
import { formatWorkspaceDateTime } from '../utils/workspace-date-time';

type Props = { appointmentId: number };

export function AppointmentDetailScreen({ appointmentId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const appointment = useAppointment(appointmentId);
  const patient = usePatient(appointment.data?.paciente_id ?? 0);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar citas clínicas."
      />
    );
  }

  if (appointment.isLoading) {
    return <LoadingState title="Cargando la cita" />;
  }

  if (appointment.isError || !appointment.data) {
    return (
      <ErrorState
        title="No se pudo cargar la cita"
        message="La cita no existe o no tenés acceso a ella."
      />
    );
  }

  const item = appointment.data;
  const patientName = patient.data
    ? fullPatientName(patient.data.persona.nombres, patient.data.persona.apellidos)
    : `Paciente #${item.paciente_id}`;

  return (
    <Screen tint="agenda">
      <View style={styles.header}>
        <Button accessibilityLabel="Volver" icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver
        </Button>
        <Text style={styles.title}>Cita clínica</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons color={theme.color.primary} name="calendar-outline" size={24} />
            <Text style={styles.cardTitle}>{formatWorkspaceDateTime(item.inicio)}</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Hasta {formatWorkspaceDateTime(item.fin)}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={item.status?.nombre ?? 'Sin estado'} />
            <Badge label={item.appointment_type?.nombre ?? 'Tipo no indicado'} />
          </View>
        </View>

        <InfoCard icon="person-outline" title="Paciente">
          <InfoRow label="Nombre" value={patientName} />
          <Button
            accessibilityLabel="Ver ficha del paciente"
            icon="folder-open-outline"
            onPress={() => router.push(`/(staff)/patients/${item.paciente_id}` as Href)}
            variant="secondary"
          >
            Ver ficha del paciente
          </Button>
        </InfoCard>

        {item.professional ? (
          <InfoCard icon="medkit-outline" title="Profesional">
            <InfoRow label="Nombre" value={item.professional.full_name} />
            <InfoRow label="Especialidad" value={item.professional.specialty} />
          </InfoCard>
        ) : null}

        {item.location ? (
          <InfoCard icon="location-outline" title="Ubicación">
            <InfoRow label="Sede" value={item.location.nombre} />
            <InfoRow label="Dirección" value={item.location.direccion} />
            {item.location.consultorio ? (
              <InfoRow label="Consultorio" value={item.location.consultorio} />
            ) : null}
          </InfoCard>
        ) : null}

        <InfoCard icon="document-text-outline" title="Notas">
          <Text style={styles.notes}>{item.notas ?? 'Sin notas registradas.'}</Text>
        </InfoCard>
      </ScrollView>
    </Screen>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function InfoCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons color={theme.color.primary} name={icon} size={22} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', gap: theme.spacing.sm },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl, paddingTop: theme.spacing.lg },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardTitle: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  cardSubtitle: { color: theme.color.mutedText, fontSize: 14 },
  cardBody: { gap: theme.spacing.md },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  badge: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  badgeText: { color: theme.color.primaryPressed, fontSize: 12, fontWeight: '800' },
  infoRow: { gap: 2 },
  infoLabel: { color: theme.color.mutedText, fontSize: 12 },
  infoValue: { color: theme.color.text, fontSize: 16 },
  notes: { color: theme.color.text, fontSize: 15, lineHeight: 21 },
});
