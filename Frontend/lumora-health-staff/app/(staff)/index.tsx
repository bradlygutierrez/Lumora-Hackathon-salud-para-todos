import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useProfessionalAgenda } from '@/src/features/appointments/hooks/use-appointments';
import { formatWorkspaceDateTime } from '@/src/features/appointments/utils/workspace-date-time';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useMyPatients } from '@/src/features/patients/hooks/use-my-patients';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

type QuickAccessProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const agenda = useProfessionalAgenda();
  const myPatients = useMyPatients();

  const firstName =
    session?.user?.persona.nombres?.trim().split(/\s+/)[0] ??
    session?.user?.username ??
    'Profesional';
  const upcoming = [...(agenda.data ?? [])]
    .sort(
      (left, right) =>
        new Date(left.inicio).getTime() - new Date(right.inicio).getTime(),
    )
    .slice(0, 3);
  const dateLabel = new Intl.DateTimeFormat('es-NI', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return (
    <Screen>
      <AppTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Hola, {firstName}</Text>
          <Text style={styles.subtitle}>{dateLabel}</Text>
          <Text style={styles.description}>
            Tu espacio clínico para pacientes, agenda y seguimiento profesional.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                color={theme.color.primaryPressed}
                name="people-outline"
                size={22}
              />
            </View>
            <Text style={styles.statValue}>
              {myPatients.isLoading ? '—' : (myPatients.data?.length ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Pacientes vinculados</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                color={theme.color.primaryPressed}
                name="calendar-outline"
                size={22}
              />
            </View>
            <Text style={styles.statValue}>
              {agenda.isLoading ? '—' : (agenda.data?.length ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Citas en agenda</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>ACCESO RÁPIDO</Text>
              <Text style={styles.sectionTitle}>Acciones clínicas</Text>
            </View>
          </View>
          <View style={styles.quickGrid}>
            <QuickAccess
              icon="people-outline"
              label="Pacientes"
              onPress={() => router.push('/(staff)/patients' as Href)}
            />
            <QuickAccess
              icon="calendar-outline"
              label="Mi agenda"
              onPress={() => router.push('/(staff)/agenda' as Href)}
            />
            <QuickAccess
              icon="medical-outline"
              label="Personal"
              onPress={() => router.push('/(staff)/directory' as Href)}
            />
            <QuickAccess
              icon="settings-outline"
              label="Ajustes"
              onPress={() => router.push('/(staff)/profile' as Href)}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>AGENDA</Text>
              <Text style={styles.sectionTitle}>Próximas citas</Text>
            </View>
            <Pressable
              accessibilityLabel="Ver agenda completa"
              accessibilityRole="button"
              onPress={() => router.push('/(staff)/agenda' as Href)}
            >
              <Text style={styles.viewAll}>Ver todo</Text>
            </Pressable>
          </View>

          {agenda.isError ? (
            <Text style={styles.muted}>
              No se pudo cargar la agenda en este momento.
            </Text>
          ) : upcoming.length === 0 && !agenda.isLoading ? (
            <View style={styles.emptyAgenda}>
              <Ionicons
                color={theme.color.primary}
                name="calendar-clear-outline"
                size={28}
              />
              <Text style={styles.muted}>No hay citas próximas publicadas.</Text>
            </View>
          ) : (
            <View style={styles.agendaList}>
              {upcoming.map((item, index) => (
                <Pressable
                  accessibilityLabel={`Abrir paciente ${item.paciente_nombre}`}
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    router.push(
                      `/(staff)/patients/${item.paciente_id}` as Href,
                    )
                  }
                  style={[
                    styles.agendaRow,
                    index === 0 ? styles.agendaRowNext : null,
                  ]}
                >
                  <View style={styles.agendaTime}>
                    <Text style={styles.agendaTimeText}>
                      {formatWorkspaceDateTime(item.inicio)}
                    </Text>
                  </View>
                  <View style={styles.agendaCopy}>
                    <Text style={styles.agendaPatient}>
                      {item.paciente_nombre}
                    </Text>
                    <Text style={styles.agendaMeta}>
                      {item.tipo_cita?.nombre ?? 'Cita clínica'}
                      {item.ubicacion?.nombre
                        ? ` · ${item.ubicacion.nombre}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons
                    color={theme.color.primaryPressed}
                    name="chevron-forward"
                    size={20}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuickAccess({ icon, label, onPress }: QuickAccessProps) {
  return (
    <Pressable
      accessibilityLabel={`Abrir ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.quickIcon}>
        <Ionicons color={theme.color.primaryPressed} name={icon} size={26} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  hero: {
    gap: 4,
  },
  title: {
    color: theme.color.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.color.primary,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  description: {
    color: theme.color.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    padding: theme.spacing.lg,
  },
  statIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    height: 40,
    justifyContent: 'center',
    marginBottom: 3,
    width: 40,
  },
  statValue: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    color: theme.color.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    color: theme.color.subtleText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickCard: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    flexBasis: '46%',
    flexGrow: 1,
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 108,
    padding: theme.spacing.md,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickLabel: {
    color: theme.color.text,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  viewAll: {
    color: theme.color.primaryPressed,
    fontSize: 13,
    fontWeight: '900',
  },
  agendaList: {
    gap: theme.spacing.sm,
  },
  agendaRow: {
    alignItems: 'center',
    borderBottomColor: theme.color.softBorder,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 74,
    paddingVertical: theme.spacing.sm,
  },
  agendaRowNext: {
    backgroundColor: theme.color.primarySoft,
    borderBottomWidth: 0,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  agendaTime: {
    maxWidth: 126,
    minWidth: 100,
  },
  agendaTimeText: {
    color: theme.color.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
  },
  agendaCopy: {
    flex: 1,
    gap: 3,
  },
  agendaPatient: {
    color: theme.color.text,
    fontSize: 16,
    fontWeight: '900',
  },
  agendaMeta: {
    color: theme.color.mutedText,
    fontSize: 12,
  },
  emptyAgenda: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
  muted: {
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
});
