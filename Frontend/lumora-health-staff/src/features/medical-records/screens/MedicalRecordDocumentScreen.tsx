import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { structuredHistoryPathForSection } from '@/src/features/medical-records/components/structured-history.navigation';
import { ApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import {
  useMedicalRecordDocument,
  useMedicalRecordDocumentPdf,
} from '../hooks/use-medical-record-document';
import type {
  DocumentConsultation,
  DocumentPrescription,
  DocumentVitalSigns,
  MedicalRecordDocument,
} from '../types/medical-record-document.types';
import {
  downloadMedicalRecordPdf,
  shareMedicalRecordPdf,
} from '../utils/medical-record-pdf';

type Props = {
  patientId: number;
};

type PdfAction = 'download' | 'share' | null;

function formatDate(value: string | null) {
  if (!value) return 'No registrada';
  if (!value.includes('T')) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(
      new Date(year, month - 1, day),
    );
  }
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function vitalValues(vital: DocumentVitalSigns) {
  const values: { label: string; value: string }[] = [];
  if (vital.temperatura_c !== null) {
    values.push({ label: 'Temperatura', value: `${vital.temperatura_c} °C` });
  }
  if (vital.frecuencia_cardiaca !== null) {
    values.push({ label: 'Frecuencia cardiaca', value: `${vital.frecuencia_cardiaca} bpm` });
  }
  if (vital.frecuencia_respiratoria !== null) {
    values.push({ label: 'Frecuencia respiratoria', value: `${vital.frecuencia_respiratoria} rpm` });
  }
  if (vital.presion_sistolica !== null && vital.presion_diastolica !== null) {
    values.push({
      label: 'Presión arterial',
      value: `${vital.presion_sistolica}/${vital.presion_diastolica} mmHg`,
    });
  }
  if (vital.saturacion_oxigeno !== null) {
    values.push({ label: 'SpO₂', value: `${vital.saturacion_oxigeno}%` });
  }
  if (vital.peso_kg !== null) {
    values.push({ label: 'Peso', value: `${vital.peso_kg} kg` });
  }
  if (vital.talla_cm !== null) {
    values.push({ label: 'Talla', value: `${vital.talla_cm} cm` });
  }
  if (vital.glucosa_mg_dl !== null) {
    values.push({ label: 'Glucosa', value: `${vital.glucosa_mg_dl} mg/dL` });
  }
  return values;
}

export function MedicalRecordDocumentScreen({ patientId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const documentQuery = useMedicalRecordDocument(patientId);
  const pdfMutation = useMedicalRecordDocumentPdf(patientId);
  const [pdfAction, setPdfAction] = useState<PdfAction>(null);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso clínico para consultar este expediente."
      />
    );
  }

  if (documentQuery.isLoading) {
    return <LoadingState title="Cargando expediente documental" />;
  }

  if (documentQuery.isError || !documentQuery.data) {
    const forbidden =
      documentQuery.error instanceof ApiError &&
      documentQuery.error.code === 'forbidden';
    return (
      <Screen>
        <View style={styles.remoteState}>
          <ErrorState
            title={forbidden ? 'Acceso denegado' : 'No se pudo cargar el expediente'}
            message={
              forbidden
                ? 'El backend no autoriza el acceso clínico a este paciente.'
                : 'Verificá la conexión e intentá nuevamente.'
            }
          />
          {!forbidden ? (
            <Button
              accessibilityLabel="Reintentar carga del expediente documental"
              onPress={() => documentQuery.refetch()}
              variant="secondary"
            >
              Reintentar
            </Button>
          ) : null}
        </View>
      </Screen>
    );
  }

  const document = documentQuery.data;

  async function runPdfAction(action: Exclude<PdfAction, null>) {
    setPdfAction(action);
    setPdfMessage(null);
    try {
      const payload = await pdfMutation.mutateAsync();
      if (action === 'download') {
        await downloadMedicalRecordPdf(payload);
        setPdfMessage('PDF preparado de forma segura.');
      } else {
        const shared = await shareMedicalRecordPdf(payload);
        setPdfMessage(
          shared
            ? 'Se abrió el menú para compartir el PDF.'
            : 'Compartir PDF no está disponible en esta plataforma.',
        );
      }
    } catch {
      setPdfMessage('No se pudo obtener el PDF. Verificá el acceso e intentá nuevamente.');
    } finally {
      setPdfAction(null);
    }
  }

  const recordId = document.expediente?.id;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Button
            accessibilityLabel="Volver al expediente médico"
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          >
            Volver
          </Button>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>EXPEDIENTE DOCUMENTAL</Text>
            <Text style={styles.title}>Documento clínico consolidado</Text>
          </View>
        </View>

        <PatientHeader document={document} />

        <View style={styles.pdfActions}>
          <Button
            accessibilityLabel="Descargar PDF del expediente"
            icon="download-outline"
            loading={pdfAction === 'download'}
            onPress={() => runPdfAction('download')}
          >
            Descargar PDF
          </Button>
          <Button
            accessibilityLabel="Compartir o abrir PDF del expediente"
            disabled={pdfAction !== null}
            icon="share-social-outline"
            loading={pdfAction === 'share'}
            onPress={() => runPdfAction('share')}
            variant="secondary"
          >
            Compartir / abrir PDF
          </Button>
        </View>
        {pdfMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.statusMessage}>
            {pdfMessage}
          </Text>
        ) : null}

        <DocumentSection
          actionLabel={recordId ? 'Gestionar antecedentes' : undefined}
          icon="reader-outline"
          onAction={
            recordId
              ? () => {
                  const path = structuredHistoryPathForSection(
                    patientId,
                    recordId,
                    'historial',
                  );
                  if (path) router.push(path as Href);
                }
              : undefined
          }
          title="Antecedentes"
        >
          {document.antecedentes.length > 0 ? (
            document.antecedentes.map((item) => (
              <EntryCard key={item.id} title={item.tipo.nombre}>
                <Detail label="Descripción" value={item.descripcion} />
                <Detail label="Fecha" value={formatDate(item.fecha)} />
              </EntryCard>
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel={recordId ? 'Gestionar alergias' : undefined}
          icon="warning-outline"
          onAction={
            recordId
              ? () => {
                  const path = structuredHistoryPathForSection(
                    patientId,
                    recordId,
                    'alergias',
                  );
                  if (path) router.push(path as Href);
                }
              : undefined
          }
          title="Alergias"
        >
          {document.alergias.length > 0 ? (
            document.alergias.map((item) => (
              <EntryCard key={item.id} title={item.nombre}>
                <Detail label="Severidad" value={item.severidad?.nombre ?? 'No indicada'} />
                <Detail label="Estado" value={item.estado?.nombre ?? 'No indicado'} />
                {item.observaciones ? <Detail label="Observaciones" value={item.observaciones} /> : null}
              </EntryCard>
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel={recordId ? 'Gestionar discapacidades' : undefined}
          icon="accessibility-outline"
          onAction={
            recordId
              ? () => {
                  const path = structuredHistoryPathForSection(
                    patientId,
                    recordId,
                    'discapacidades',
                  );
                  if (path) router.push(path as Href);
                }
              : undefined
          }
          title="Discapacidades"
        >
          {document.discapacidades.length > 0 ? (
            document.discapacidades.map((item) => (
              <EntryCard key={item.id} title={item.nombre}>
                <Detail label="Estado" value={item.estado?.nombre ?? 'No indicado'} />
                {item.observaciones ? <Detail label="Observaciones" value={item.observaciones} /> : null}
              </EntryCard>
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel={recordId ? 'Gestionar condiciones' : undefined}
          icon="heart-outline"
          onAction={
            recordId
              ? () => {
                  const path = structuredHistoryPathForSection(
                    patientId,
                    recordId,
                    'condiciones',
                  );
                  if (path) router.push(path as Href);
                }
              : undefined
          }
          title="Condiciones"
        >
          {document.condiciones.length > 0 ? (
            document.condiciones.map((item) => (
              <EntryCard key={item.id} title={item.nombre}>
                <Detail label="Estado" value={item.estado.nombre} />
                {item.descripcion ? <Detail label="Descripción" value={item.descripcion} /> : null}
                <Detail label="Inicio" value={formatDate(item.fecha_inicio)} />
                {item.fecha_fin ? <Detail label="Fin" value={formatDate(item.fecha_fin)} /> : null}
              </EntryCard>
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel={recordId ? 'Ver consultas' : undefined}
          icon="medkit-outline"
          onAction={
            recordId
              ? () =>
                  router.push(
                    `/(staff)/patients/${patientId}/record/consultations?recordId=${recordId}` as Href,
                  )
              : undefined
          }
          title="Consultas, signos y diagnósticos"
        >
          {document.consultas.length > 0 ? (
            document.consultas.map((consultation) => (
              <ConsultationCard
                consultation={consultation}
                key={consultation.id}
                onOpen={() =>
                  router.push(
                    `/(staff)/patients/${patientId}/record/consultations/${consultation.id}` as Href,
                  )
                }
              />
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel="Ver recetas"
          icon="document-text-outline"
          onAction={() => {
            const query = recordId ? `?recordId=${recordId}` : '';
            router.push(`/(staff)/patients/${patientId}/prescriptions${query}` as Href);
          }}
          title="Recetas y medicación"
        >
          {document.recetas.length > 0 ? (
            document.recetas.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                onOpen={() =>
                  router.push(
                    `/(staff)/patients/${patientId}/prescriptions/${prescription.id}` as Href,
                  )
                }
                prescription={prescription}
              />
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>

        <DocumentSection
          actionLabel="Ver historial de mediciones"
          icon="pulse-outline"
          onAction={() =>
            router.push(`/(staff)/patients/${patientId}/measurements` as Href)
          }
          title="Indicadores"
        >
          {document.indicadores.length > 0 ? (
            document.indicadores.map((item) => (
              <EntryCard key={item.id} title={item.indicador_nombre}>
                <Detail
                  label="Valor"
                  value={`${item.valor} ${item.unidad_medida.nombre}`}
                />
                <Detail label="Fecha" value={formatDateTime(item.fecha_medicion)} />
                <Detail label="Origen" value={item.origen_registro.nombre} />
                {item.observaciones ? <Detail label="Observaciones" value={item.observaciones} /> : null}
              </EntryCard>
            ))
          ) : (
            <SectionEmpty />
          )}
        </DocumentSection>
      </ScrollView>
    </Screen>
  );
}

function PatientHeader({ document }: { document: MedicalRecordDocument }) {
  const patient = document.paciente;
  const record = document.expediente;
  return (
    <View style={styles.patientCard}>
      <View style={styles.patientHeading}>
        <View style={styles.avatar}>
          <Ionicons color={theme.color.primaryPressed} name="person" size={28} />
        </View>
        <View style={styles.patientCopy}>
          <Text style={styles.patientName}>
            {patient.nombres} {patient.apellidos}
          </Text>
          <Text style={styles.patientMeta}>
            Nacimiento: {formatDate(patient.fecha_nacimiento)}
          </Text>
          <Text style={styles.patientMeta}>
            Sexo: {patient.sexo?.nombre ?? 'No indicado'} · Sangre:{' '}
            {patient.tipo_sangre?.nombre ?? 'No indicada'}
          </Text>
        </View>
      </View>
      <View style={styles.recordMeta}>
        {record ? (
          <>
            <Detail label="Expediente" value={record.numero_expediente} />
            <Detail label="Estado" value={record.estado.nombre} />
            <Detail label="Apertura" value={formatDateTime(record.fecha_apertura)} />
          </>
        ) : (
          <Text style={styles.notice}>
            El backend no reporta un expediente formal; se muestran únicamente las
            secciones documentales disponibles para este paciente.
          </Text>
        )}
        <Detail label="Documento generado" value={formatDateTime(document.generated_at)} />
      </View>
    </View>
  );
}

function ConsultationCard({
  consultation,
  onOpen,
}: {
  consultation: DocumentConsultation;
  onOpen: () => void;
}) {
  return (
    <EntryCard
      actionLabel="Abrir consulta"
      onAction={onOpen}
      title={consultation.motivo_consulta?.nombre ?? consultation.motivo ?? 'Consulta médica'}
    >
      <Detail label="Fecha" value={formatDateTime(consultation.fecha_consulta)} />
      <Detail
        label="Profesional"
        value={`${consultation.profesional.nombre_completo} · ${consultation.profesional.especialidad}`}
      />
      {consultation.motivo ? <Detail label="Motivo" value={consultation.motivo} /> : null}
      {consultation.sintomas ? <Detail label="Síntomas" value={consultation.sintomas} /> : null}
      {consultation.evaluacion ? <Detail label="Evaluación" value={consultation.evaluacion} /> : null}
      {consultation.indicaciones ? <Detail label="Indicaciones" value={consultation.indicaciones} /> : null}
      {consultation.observaciones ? <Detail label="Observaciones" value={consultation.observaciones} /> : null}

      {consultation.signos_vitales.map((vital) => (
        <View key={vital.id} style={styles.subsection}>
          <Text style={styles.subsectionTitle}>
            Signos vitales · {formatDateTime(vital.registrado_at)}
          </Text>
          {vitalValues(vital).map((item) => (
            <Detail key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
      ))}

      {consultation.diagnosticos.length > 0 ? (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Diagnósticos</Text>
          {consultation.diagnosticos.map((diagnosis) => (
            <View key={diagnosis.id} style={styles.compactEntry}>
              <Text style={styles.compactTitle}>
                {diagnosis.descripcion}
                {diagnosis.es_principal ? ' · Principal' : ''}
              </Text>
              <Text style={styles.compactMeta}>
                {diagnosis.tipo.nombre} · {formatDate(diagnosis.fecha_diagnostico)}
              </Text>
              <Text style={styles.compactMeta}>
                {diagnosis.profesional.nombre_completo} · {diagnosis.profesional.especialidad}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </EntryCard>
  );
}

function PrescriptionCard({
  prescription,
  onOpen,
}: {
  prescription: DocumentPrescription;
  onOpen: () => void;
}) {
  return (
    <EntryCard
      actionLabel="Abrir receta"
      onAction={onOpen}
      title={prescription.titulo ?? 'Receta médica'}
    >
      <Detail label="Estado" value={prescription.estado.nombre} />
      <Detail label="Emisión" value={formatDateTime(prescription.fecha_emision)} />
      <Detail label="Vigencia" value={formatDate(prescription.vigencia_hasta)} />
      <Detail
        label="Profesional"
        value={`${prescription.profesional.nombre_completo} · ${prescription.profesional.especialidad}`}
      />
      {prescription.observaciones ? <Detail label="Observaciones" value={prescription.observaciones} /> : null}
      {prescription.detalles.map((detail) => (
        <View key={detail.id} style={styles.subsection}>
          <Text style={styles.subsectionTitle}>{detail.medicamento.nombre}</Text>
          {detail.medicamento.nombre_generico ? (
            <Detail label="Genérico" value={detail.medicamento.nombre_generico} />
          ) : null}
          {detail.medicamento.presentacion ? (
            <Detail label="Presentación" value={detail.medicamento.presentacion} />
          ) : null}
          {detail.medicamento.concentracion ? (
            <Detail label="Concentración" value={detail.medicamento.concentracion} />
          ) : null}
          <Detail
            label="Dosis"
            value={`${detail.dosis} · ${detail.frecuencia} · ${detail.via_administracion.nombre}`}
          />
          <Detail
            label="Duración"
            value={`${detail.duracion_dias} día(s) · ${detail.cantidad_total} ${detail.unidad_medida.nombre}`}
          />
          {detail.instrucciones ? <Detail label="Instrucciones" value={detail.instrucciones} /> : null}
        </View>
      ))}
    </EntryCard>
  );
}

function DocumentSection({
  actionLabel,
  children,
  icon,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons color={theme.color.primary} name={icon} size={22} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {actionLabel && onAction ? (
          <Button
            accessibilityLabel={actionLabel}
            onPress={onAction}
            variant="ghost"
          >
            {actionLabel}
          </Button>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EntryCard({
  actionLabel,
  children,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: React.ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <Button onPress={onAction} variant="ghost">
            {actionLabel}
          </Button>
        ) : null}
      </View>
      <View style={styles.entryBody}>{children}</View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SectionEmpty() {
  return <Text style={styles.emptyText}>Sin registros incluidos por el backend.</Text>;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  remoteState: { flex: 1, gap: theme.spacing.md },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  titleCopy: { flex: 1, gap: 2 },
  eyebrow: {
    color: theme.color.subtleText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  patientCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  patientHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  patientCopy: { flex: 1, gap: 3 },
  patientName: { color: theme.color.text, fontSize: 23, fontWeight: '900' },
  patientMeta: { color: theme.color.mutedText, fontSize: 13, lineHeight: 18 },
  recordMeta: {
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  notice: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
    padding: theme.spacing.md,
  },
  pdfActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  statusMessage: {
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sectionTitle: { color: theme.color.text, fontSize: 20, fontWeight: '900' },
  sectionBody: { gap: theme.spacing.md },
  entry: {
    backgroundColor: theme.color.appBackground,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  entryTitle: { color: theme.color.text, flex: 1, fontSize: 16, fontWeight: '800' },
  entryBody: { gap: theme.spacing.sm },
  detailRow: { gap: 2 },
  detailLabel: {
    color: theme.color.subtleText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: { color: theme.color.text, fontSize: 14, lineHeight: 20 },
  subsection: {
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  subsectionTitle: { color: theme.color.text, fontSize: 14, fontWeight: '800' },
  compactEntry: {
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 3,
    gap: 2,
    paddingLeft: theme.spacing.sm,
  },
  compactTitle: { color: theme.color.text, fontSize: 14, fontWeight: '700' },
  compactMeta: { color: theme.color.mutedText, fontSize: 12 },
  emptyText: { color: theme.color.mutedText, fontSize: 14 },
});
