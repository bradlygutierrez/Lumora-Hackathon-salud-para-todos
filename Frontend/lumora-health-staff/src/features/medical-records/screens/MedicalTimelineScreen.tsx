import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { useMedicalRecordTimeline } from '../hooks/use-medical-record';
import type {
  ClinicalSectionId,
  ClinicalTimelineItem,
} from '../types/medical-record.types';

type Props = {
  patientId: number;
  recordId: number;
};

type TimelineFilter = {
  label: string;
  type?: string;
};

const filters: TimelineFilter[] = [
  { label: 'Todos' },
  { label: 'Consultas', type: 'consulta' },
  { label: 'Signos vitales', type: 'signos_vitales' },
  { label: 'Notas', type: 'nota' },
  { label: 'Diagnósticos', type: 'diagnostico' },
  { label: 'Recetas', type: 'receta' },
  { label: 'Condiciones', type: 'condicion' },
  { label: 'Mediciones', type: 'medicion' },
  { label: 'Alertas', type: 'alerta' },
  { label: 'Historial', type: 'antecedente' },
];

const sectionByEventType: Record<string, ClinicalSectionId | undefined> = {
  antecedente: 'historial',
  consulta: 'consultas',
  signos_vitales: 'consultas',
  nota: 'consultas',
  diagnostico: 'diagnosticos',
  condicion: 'condiciones',
  historial_condicion: 'condiciones',
  receta: 'recetas',
  medicion: 'indicadores',
  alerta: 'alertas',
  expediente: undefined,
  auditoria: undefined,
};

const iconByEventType: Record<string, keyof typeof Ionicons.glyphMap> = {
  antecedente: 'reader-outline',
  consulta: 'medkit-outline',
  signos_vitales: 'pulse-outline',
  nota: 'document-text-outline',
  diagnostico: 'clipboard-outline',
  condicion: 'heart-outline',
  historial_condicion: 'git-commit-outline',
  receta: 'receipt-outline',
  medicion: 'analytics-outline',
  alerta: 'warning-outline',
  expediente: 'folder-open-outline',
  auditoria: 'shield-checkmark-outline',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function destinationForEvent(patientId: number, recordId: number, event: ClinicalTimelineItem): Href {
  if (event.tipo === 'consulta' && /^\d+$/.test(event.entidad_id)) {
    return `/(staff)/patients/${patientId}/record/consultations/${event.entidad_id}` as Href;
  }
  if (event.tipo === 'signos_vitales' || event.tipo === 'nota') {
    return `/(staff)/patients/${patientId}/record/consultations?recordId=${recordId}` as Href;
  }
  const section = sectionByEventType[event.tipo];
  const path = section
    ? `/(staff)/patients/${patientId}/record?section=${section}`
    : `/(staff)/patients/${patientId}/record`;
  return path as Href;
}

export function MedicalTimelineScreen({ patientId, recordId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const timeline = useMedicalRecordTimeline(recordId, { limit: 10, tipo: selectedType });
  const events = useMemo(
    () => timeline.data?.pages.flatMap((page) => page.items) ?? [],
    [timeline.data?.pages],
  );

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar la línea de tiempo clínica."
      />
    );
  }
  if (timeline.isLoading) return <LoadingState title="Cargando línea de tiempo" />;
  if (timeline.isError) {
    return (
      <ErrorState
        title="No se pudo cargar la línea de tiempo"
        message="Verificá la conexión y los permisos clínicos."
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver al expediente
        </Button>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons color={theme.color.primaryPressed} name="time-outline" size={28} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>EXPEDIENTE #{recordId}</Text>
            <Text style={styles.title}>Línea de Tiempo Médica</Text>
            <Text style={styles.subtitle}>
              Eventos clínicos ordenados cronológicamente desde FastAPI.
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => {
            const selected = selectedType === filter.type;
            return (
              <Pressable
                accessibilityLabel={`Filtrar timeline por ${filter.label}`}
                accessibilityRole="button"
                key={filter.label}
                onPress={() => setSelectedType(filter.type)}
                style={({ pressed }) => [
                  styles.filter,
                  selected ? styles.filterSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.filterText, selected ? styles.filterTextSelected : null]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {events.length === 0 ? (
          <EmptyState
            title="Sin eventos clínicos"
            message="No hay eventos disponibles para el filtro seleccionado."
          />
        ) : (
          <View style={styles.timeline}>
            {events.map((event, index) => (
              <View key={`${event.entidad}-${event.entidad_id}-${event.occurred_at}`} style={styles.eventRow}>
                <View style={styles.rail}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      color={theme.color.primaryPressed}
                      name={iconByEventType[event.tipo] ?? 'ellipse-outline'}
                      size={18}
                    />
                  </View>
                  {index < events.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <Pressable
                  accessibilityLabel={`Abrir evento ${event.titulo}`}
                  accessibilityRole="button"
                  onPress={() => router.push(destinationForEvent(patientId, recordId, event))}
                  style={({ pressed }) => [styles.eventCard, pressed ? styles.pressed : null]}
                >
                  <View style={styles.eventTopRow}>
                    <Text style={styles.eventType}>{event.tipo.replaceAll('_', ' ')}</Text>
                    <Text style={styles.eventDate}>{formatDateTime(event.occurred_at)}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.titulo}</Text>
                  {event.detalle ? <Text style={styles.eventDetail}>{event.detalle}</Text> : null}
                  <View style={styles.openRow}>
                    <Text style={styles.openText}>{event.tipo === 'consulta' ? 'Abrir consulta' : 'Abrir sección relacionada'}</Text>
                    <Ionicons color={theme.color.primaryPressed} name="arrow-forward" size={15} />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {timeline.hasNextPage ? (
          <Button
            accessibilityLabel="Cargar más eventos clínicos"
            loading={timeline.isFetchingNextPage}
            onPress={() => void timeline.fetchNextPage()}
            variant="secondary"
          >
            Cargar más
          </Button>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.lg,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  filters: { gap: theme.spacing.sm, paddingVertical: 2 },
  filter: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterSelected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  filterText: { color: theme.color.text, fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  pressed: { opacity: 0.76 },
  timeline: { gap: 0 },
  eventRow: { alignItems: 'stretch', flexDirection: 'row', gap: theme.spacing.md },
  rail: { alignItems: 'center', width: 36 },
  eventIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  line: { backgroundColor: theme.color.softBorder, flex: 1, minHeight: 28, width: 2 },
  eventCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  eventTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  eventType: {
    color: theme.color.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventDate: { color: theme.color.subtleText, fontSize: 12 },
  eventTitle: { color: theme.color.text, fontSize: 16, fontWeight: '900' },
  eventDetail: { color: theme.color.mutedText, fontSize: 14, lineHeight: 21 },
  openRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 2 },
  openText: { color: theme.color.primaryPressed, fontSize: 12, fontWeight: '800' },
});
