import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { ClinicalSectionCard } from '../components/ClinicalSectionCard';
import { useMedicalRecordSummary } from '../hooks/use-medical-record';
import type {
  ClinicalSectionId,
  PatientClinicalSummary,
} from '../types/medical-record.types';

type Props = {
  patientId: number;
  initialSection?: ClinicalSectionId;
};

type SectionDefinition = {
  id: ClinicalSectionId;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: (summary: PatientClinicalSummary) => number;
};

const sections: SectionDefinition[] = [
  { id: 'condiciones', title: 'Condiciones', icon: 'heart-outline', count: (s) => s.condiciones.length },
  { id: 'alergias', title: 'Alergias', icon: 'warning-outline', count: (s) => s.alergias.length },
  { id: 'discapacidades', title: 'Discapacidades', icon: 'accessibility-outline', count: (s) => s.discapacidades.length },
  { id: 'historial', title: 'Historial médico', icon: 'reader-outline', count: (s) => s.antecedentes.length },
  { id: 'consultas', title: 'Consultas', icon: 'medkit-outline', count: (s) => s.consultas.length },
  {
    id: 'diagnosticos',
    title: 'Diagnósticos',
    icon: 'clipboard-outline',
    count: (s) => s.consultas.reduce((total, item) => total + item.diagnosticos.length, 0),
  },
  { id: 'recetas', title: 'Recetas', icon: 'document-text-outline', count: (s) => s.recetas.length },
  { id: 'indicadores', title: 'Indicadores', icon: 'pulse-outline', count: (s) => s.mediciones.length },
  { id: 'alertas', title: 'Alertas', icon: 'notifications-outline', count: (s) => s.alertas.length },
];

function formatDate(value: string | null) {
  if (!value) return 'Fecha no registrada';
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(parsed);
}

function sectionItems(summary: PatientClinicalSummary, section: ClinicalSectionId): string[] {
  switch (section) {
    case 'condiciones':
      return summary.condiciones.map((item) => item.nombre);
    case 'alergias':
      return summary.alergias.map((item) => item.nombre);
    case 'discapacidades':
      return summary.discapacidades.map((item) => item.nombre);
    case 'historial':
      return summary.antecedentes.map((item) => item.descripcion);
    case 'consultas':
      return summary.consultas.map(
        (item) => `${item.consulta.motivo ?? 'Consulta médica'} · ${formatDate(item.consulta.fecha_consulta)}`,
      );
    case 'diagnosticos':
      return summary.consultas.flatMap((item) => item.diagnosticos.map((diagnosis) => diagnosis.descripcion));
    case 'recetas':
      return summary.recetas.map((item) => item.titulo ?? `Receta ${item.id}`);
    case 'indicadores':
      return summary.mediciones.map(
        (item) => `${item.indicador_nombre}: ${item.valor} ${item.unidad_medida}`,
      );
    case 'alertas':
      return summary.alertas.map((item) => `${item.nivel_severidad}: ${item.mensaje}`);
  }
}

export function MedicalRecordSummaryScreen({ patientId, initialSection }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const summaryQuery = useMedicalRecordSummary(patientId);
  const [selectedSection, setSelectedSection] = useState<ClinicalSectionId | null>(
    initialSection ?? null,
  );

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar el expediente clínico."
      />
    );
  }
  if (summaryQuery.isLoading) return <LoadingState title="Cargando expediente" />;
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title="No se pudo cargar el expediente"
        message="Verificá la conexión y el acceso clínico del paciente."
      />
    );
  }

  const summary = summaryQuery.data;
  const record = summary.expediente;

  if (!record) {
    return (
      <Screen>
        <View style={styles.emptyScreen}>
          <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
            Volver
          </Button>
          <EmptyState
            title="Sin expediente"
            message="El paciente no tiene expediente clínico disponible."
          />
        </View>
      </Screen>
    );
  }

  const selectedItems = selectedSection ? sectionItems(summary, selectedSection) : [];
  const selectedTitle = sections.find((item) => item.id === selectedSection)?.title;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver al paciente
        </Button>

        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Ionicons color={theme.color.primaryPressed} name="person" size={28} />
          </View>
          <View style={styles.patientCopy}>
            <Text style={styles.patientName}>
              {summary.paciente.nombres} {summary.paciente.apellidos}
            </Text>
            <Text style={styles.patientMeta}>
              {formatDate(summary.paciente.fecha_nacimiento)} · Paciente #{summary.paciente_id}
            </Text>
          </View>
          <View style={[styles.statusBadge, record.activo ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{record.activo ? 'Activo' : 'Inactivo'}</Text>
          </View>
        </View>

        <View style={styles.recordHeader}>
          <View>
            <Text style={styles.eyebrow}>EXPEDIENTE MÉDICO</Text>
            <Text style={styles.recordNumber}>{record.numero_expediente}</Text>
          </View>
          <Button
            accessibilityLabel="Abrir línea de tiempo médica"
            icon="time-outline"
            onPress={() =>
              router.push(
                `/(staff)/patients/${patientId}/record/timeline?recordId=${record.id}` as Href,
              )
            }
            variant="secondary"
          >
            Línea de tiempo
          </Button>
        </View>

        {summary.alertas.length > 0 ? (
          <View style={styles.alertArea}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons color={theme.color.warning} name="warning-outline" size={20} />
              <Text style={styles.alertHeading}>Alertas clínicas activas</Text>
            </View>
            {summary.alertas.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <Text style={styles.alertSeverity}>{alert.nivel_severidad}</Text>
                <Text style={styles.alertText}>{alert.mensaje}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen clínico</Text>
          <Text style={styles.sectionSubtitle}>
            Información consolidada por FastAPI para este expediente.
          </Text>
        </View>

        <View style={styles.grid}>
          {sections.map((section) => (
            <View key={section.id} style={styles.gridItem}>
              <ClinicalSectionCard
                count={section.count(summary)}
                icon={section.icon}
                id={section.id}
                onPress={setSelectedSection}
                selected={selectedSection === section.id}
                title={section.title}
              />
            </View>
          ))}
        </View>

        {selectedSection ? (
          <View style={styles.detailCard}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.detailTitle}>{selectedTitle}</Text>
              <Text style={styles.detailCount}>{selectedItems.length}</Text>
            </View>
            {selectedItems.length > 0 ? (
              selectedItems.map((item, index) => (
                <View key={`${selectedSection}-${index}`} style={styles.detailRow}>
                  <View style={styles.dot} />
                  <Text style={styles.detailText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Sin registros en esta sección.</Text>
            )}
          </View>
        ) : null}

        {record.notas ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Notas del expediente</Text>
            <Text style={styles.notesText}>{record.notas}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  emptyScreen: { flex: 1, gap: theme.spacing.lg },
  patientCard: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  patientCopy: { flex: 1, gap: theme.spacing.xs },
  patientName: { color: theme.color.text, fontSize: 22, fontWeight: '900' },
  patientMeta: { color: theme.color.mutedText, fontSize: theme.typography.caption },
  statusBadge: { borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  activeBadge: { backgroundColor: theme.color.successSoft },
  inactiveBadge: { backgroundColor: theme.color.dangerSoft },
  statusText: { color: theme.color.text, fontSize: 12, fontWeight: '800' },
  recordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  recordNumber: { color: theme.color.primaryPressed, fontSize: 28, fontWeight: '900', marginTop: 3 },
  alertArea: { gap: theme.spacing.sm },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  alertHeading: { color: theme.color.warning, fontSize: 15, fontWeight: '900' },
  alertCard: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FEDF89',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.md,
  },
  alertSeverity: { color: theme.color.warning, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  alertText: { color: theme.color.text, fontSize: 14, lineHeight: 20 },
  sectionHeader: { gap: 4 },
  sectionTitle: { color: theme.color.text, fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  gridItem: { minWidth: 250, flexBasis: '47%', flexGrow: 1 },
  detailCard: {
    backgroundColor: theme.color.appBackground,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  detailTitle: { color: theme.color.text, flex: 1, fontSize: 18, fontWeight: '900' },
  detailCount: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    color: theme.color.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 28,
    paddingHorizontal: 9,
    paddingVertical: 5,
    textAlign: 'center',
  },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm },
  dot: { backgroundColor: theme.color.primary, borderRadius: 4, height: 7, marginTop: 7, width: 7 },
  detailText: { color: theme.color.text, flex: 1, fontSize: 14, lineHeight: 21 },
  emptyText: { color: theme.color.mutedText, fontSize: 14 },
  notesCard: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  notesTitle: { color: theme.color.text, fontSize: 15, fontWeight: '900' },
  notesText: { color: theme.color.mutedText, fontSize: 14, lineHeight: 21 },
});
