import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Button } from '@/src/shared/components/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { ClinicalSectionCard } from '../components/ClinicalSectionCard';
import { structuredHistoryPathForSection } from '../components/structured-history.navigation';
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
  {
    id: 'condiciones',
    title: 'Condiciones',
    icon: 'heart-outline',
    count: (s) => s.condiciones.length,
  },
  {
    id: 'alergias',
    title: 'Alergias',
    icon: 'warning-outline',
    count: (s) => s.alergias.length,
  },
  {
    id: 'discapacidades',
    title: 'Discapacidades',
    icon: 'accessibility-outline',
    count: (s) => s.discapacidades.length,
  },
  {
    id: 'historial',
    title: 'Historial médico',
    icon: 'reader-outline',
    count: (s) => s.antecedentes.length,
  },
  {
    id: 'consultas',
    title: 'Consultas',
    icon: 'medkit-outline',
    count: (s) => s.consultas.length,
  },
  {
    id: 'diagnosticos',
    title: 'Diagnósticos',
    icon: 'clipboard-outline',
    count: (s) =>
      s.consultas.reduce(
        (total, item) => total + item.diagnosticos.length,
        0,
      ),
  },
  {
    id: 'recetas',
    title: 'Recetas',
    icon: 'document-text-outline',
    count: (s) => s.recetas.length,
  },
  {
    id: 'indicadores',
    title: 'Indicadores',
    icon: 'pulse-outline',
    count: (s) => s.mediciones.length,
  },
  {
    id: 'alertas',
    title: 'Alertas',
    icon: 'notifications-outline',
    count: (s) => s.alertas.length,
  },
];

function formatDate(value: string | null) {
  if (!value) return 'Fecha no registrada';
  const parsed = new Date(
    value.includes('T') ? value : `${value}T00:00:00`,
  );
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
  }).format(parsed);
}

function sectionItems(
  summary: PatientClinicalSummary,
  section: ClinicalSectionId,
): string[] {
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
        (item) =>
          `${item.consulta.motivo ?? 'Consulta médica'} · ${formatDate(
            item.consulta.fecha_consulta,
          )}`,
      );
    case 'diagnosticos':
      return summary.consultas.flatMap((item) =>
        item.diagnosticos.map((diagnosis) => diagnosis.descripcion),
      );
    case 'recetas':
      return summary.recetas.map(
        (item) => item.titulo ?? `Receta ${item.id}`,
      );
    case 'indicadores':
      return summary.mediciones.map(
        (item) =>
          `${item.indicador_nombre}: ${item.valor} ${item.unidad_medida}`,
      );
    case 'alertas':
      return summary.alertas.map(
        (item) => `${item.nivel_severidad}: ${item.mensaje}`,
      );
  }
}

export function MedicalRecordSummaryScreen({
  patientId,
  initialSection,
}: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const summaryQuery = useMedicalRecordSummary(patientId);
  const [selectedSection, setSelectedSection] =
    useState<ClinicalSectionId | null>(initialSection ?? null);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar el expediente clínico."
      />
    );
  }
  if (summaryQuery.isLoading) {
    return <LoadingState title="Cargando expediente" />;
  }
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
          <Button
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          >
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

  const selectedItems = selectedSection
    ? sectionItems(summary, selectedSection)
    : [];
  const selectedTitle = sections.find(
    (item) => item.id === selectedSection,
  )?.title;

  return (
    <Screen>
      <AppTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Button
          icon="arrow-back"
          onPress={() => router.back()}
          variant="ghost"
        >
          Volver al paciente
        </Button>

        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Ionicons
              color={theme.color.primaryPressed}
              name="person"
              size={28}
            />
          </View>
          <View style={styles.patientCopy}>
            <Text style={styles.eyebrow}>PERFIL DEL PACIENTE</Text>
            <Text style={styles.patientName}>
              {summary.paciente.nombres} {summary.paciente.apellidos}
            </Text>
            <Text style={styles.patientMeta}>
              {formatDate(summary.paciente.fecha_nacimiento)} · Paciente #
              {summary.paciente_id}
            </Text>
            <View style={styles.recordBadge}>
              <Ionicons
                color={theme.color.primaryPressed}
                name="folder-open-outline"
                size={14}
              />
              <Text style={styles.recordBadgeText}>
                {record.numero_expediente}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              record.activo ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                record.activo
                  ? styles.activeStatusText
                  : styles.inactiveStatusText,
              ]}
            >
              {record.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <View style={styles.recordHeader}>
          <View style={styles.recordHeading}>
            <Text style={styles.recordTitle}>Expediente Médico</Text>
            <Text style={styles.recordSubtitle}>
              Información clínica consolidada del expediente.
            </Text>
          </View>
          <View style={styles.recordActions}>
            <Button
              accessibilityLabel="Abrir consultas del expediente"
              icon="medkit-outline"
              onPress={() =>
                router.push(
                  `/(staff)/patients/${patientId}/record/consultations?recordId=${record.id}` as Href,
                )
              }
              variant="secondary"
            >
              Consultas
            </Button>
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
            <Button
              accessibilityLabel="Abrir expediente documental"
              icon="document-text-outline"
              onPress={() =>
                router.push(
                  `/(staff)/patients/${patientId}/record/document` as Href,
                )
              }
              variant="secondary"
            >
              Documento clínico y PDF
            </Button>
          </View>
        </View>

        {summary.alertas.length > 0 ? (
          <View style={styles.alertArea}>
            <View style={styles.alertHeader}>
              <View style={styles.alertIcon}>
                <Ionicons
                  color={theme.color.danger}
                  name="warning"
                  size={21}
                />
              </View>
              <View style={styles.alertHeaderCopy}>
                <Text style={styles.alertHeading}>Alertas clínicas</Text>
                <Text style={styles.alertSubtitle}>
                  Revisá los eventos señalados antes de continuar el flujo
                  clínico.
                </Text>
              </View>
              <View style={styles.alertCount}>
                <Text style={styles.alertCountText}>
                  {summary.alertas.length}
                </Text>
              </View>
            </View>
            {summary.alertas.slice(0, 3).map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <Text style={styles.alertSeverity}>
                  {alert.nivel_severidad}
                </Text>
                <Text style={styles.alertText}>{alert.mensaje}</Text>
              </View>
            ))}
            {summary.alertas.length > 3 ? (
              <Pressable
                accessibilityLabel="Abrir sección Alertas"
                accessibilityRole="button"
                onPress={() => {
                  const path = structuredHistoryPathForSection(
                    patientId,
                    record.id,
                    'alertas',
                  );
                  if (path) router.push(path as Href);
                }}
                style={({ pressed }) => [
                  styles.alertMore,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.alertMoreText}>
                  Ver todas las alertas
                </Text>
                <Ionicons
                  color={theme.color.danger}
                  name="arrow-forward"
                  size={16}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen clínico</Text>
          <Text style={styles.sectionSubtitle}>
            Acceso rápido a cada sección estructurada del expediente.
          </Text>
        </View>

        <View style={styles.grid}>
          {sections.map((section) => (
            <View key={section.id} style={styles.gridItem}>
              <ClinicalSectionCard
                count={section.count(summary)}
                icon={section.icon}
                id={section.id}
                onPress={(sectionId) => {
                  const structuredPath = structuredHistoryPathForSection(
                    patientId,
                    record.id,
                    sectionId,
                  );
                  if (structuredPath) {
                    return router.push(structuredPath as Href);
                  }
                  setSelectedSection(sectionId);
                }}
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
              <Text style={styles.detailCount}>
                {selectedItems.length}
              </Text>
            </View>
            {selectedSection === 'consultas' &&
            summary.consultas.length > 0 ? (
              summary.consultas.map((entry) => (
                <Pressable
                  accessibilityLabel={`Abrir consulta ${entry.consulta.id}`}
                  accessibilityRole="button"
                  key={entry.consulta.id}
                  onPress={() =>
                    router.push(
                      `/(staff)/patients/${patientId}/record/consultations/${entry.consulta.id}` as Href,
                    )
                  }
                  style={({ pressed }) => [
                    styles.consultationRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.dot} />
                  <View style={styles.consultationCopy}>
                    <Text style={styles.detailText}>
                      {entry.consulta.motivo ?? 'Consulta médica'}
                    </Text>
                    <Text style={styles.consultationMeta}>
                      {formatDate(entry.consulta.fecha_consulta)} ·{' '}
                      {entry.signos_vitales.length} signo(s) ·{' '}
                      {entry.notas.length} nota(s)
                    </Text>
                  </View>
                  <Ionicons
                    color={theme.color.primaryPressed}
                    name="chevron-forward"
                    size={18}
                  />
                </Pressable>
              ))
            ) : selectedItems.length > 0 ? (
              selectedItems.map((item, index) => (
                <View
                  key={`${selectedSection}-${index}`}
                  style={styles.detailRow}
                >
                  <View style={styles.dot} />
                  <Text style={styles.detailText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Sin registros en esta sección.
              </Text>
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
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  emptyScreen: {
    flex: 1,
    gap: theme.spacing.lg,
  },
  patientCard: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 5,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  patientCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: theme.color.subtleText,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  patientName: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: '900',
  },
  patientMeta: {
    color: theme.color.mutedText,
    fontSize: 12,
  },
  recordBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recordBadgeText: {
    color: theme.color.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadge: {
    backgroundColor: theme.color.successSoft,
  },
  inactiveBadge: {
    backgroundColor: theme.color.dangerSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  activeStatusText: {
    color: theme.color.success,
  },
  inactiveStatusText: {
    color: theme.color.danger,
  },
  recordHeader: {
    gap: theme.spacing.md,
  },
  recordHeading: {
    gap: 3,
  },
  recordTitle: {
    color: theme.color.text,
    fontSize: 23,
    fontWeight: '900',
  },
  recordSubtitle: {
    color: theme.color.mutedText,
    fontSize: 13,
  },
  recordActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  alertArea: {
    backgroundColor: theme.color.dangerSoft,
    borderColor: '#FFB5AC',
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 5,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  alertHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  alertHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  alertHeading: {
    color: theme.color.dangerText,
    fontSize: 18,
    fontWeight: '900',
  },
  alertSubtitle: {
    color: theme.color.dangerText,
    fontSize: 11,
    lineHeight: 16,
  },
  alertCount: {
    alignItems: 'center',
    backgroundColor: theme.color.danger,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    minWidth: 29,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  alertCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  alertCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    gap: 4,
    padding: theme.spacing.md,
  },
  alertSeverity: {
    color: theme.color.danger,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  alertText: {
    color: theme.color.text,
    fontSize: 13,
    lineHeight: 19,
  },
  alertMore: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  alertMoreText: {
    color: theme.color.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  gridItem: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 250,
  },
  detailCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  detailTitle: {
    color: theme.color.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
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
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dot: {
    backgroundColor: theme.color.primary,
    borderRadius: 4,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  detailText: {
    color: theme.color.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    color: theme.color.mutedText,
    fontSize: 14,
  },
  consultationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  consultationCopy: {
    flex: 1,
    gap: 2,
  },
  consultationMeta: {
    color: theme.color.subtleText,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.72,
  },
  notesCard: {
    backgroundColor: theme.color.surfaceMuted,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  notesTitle: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: '900',
  },
  notesText: {
    color: theme.color.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
});
