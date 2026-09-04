import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import {
  useClinicalNotes,
  useConsultation,
  useCreateClinicalNote,
  useCreateVitalSigns,
  useUpdateClinicalNote,
  useVitalSigns,
} from '../hooks/use-consultations';
import { clinicalNoteFormSchema, type ClinicalNoteForm } from '../schemas/clinical-note.schema';
import { vitalSignsFormSchema, type VitalSignsForm } from '../schemas/vital-signs.schema';
import type { ClinicalNote, VitalSignsCreate } from '../types/consultation.types';

const PAGE_SIZE = 5;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function mutationError(error: unknown, action: 'signs' | 'note') {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') return 'No tenés permiso para modificar información clínica.';
  if (apiError.code === 'not_found') return action === 'signs' ? 'La consulta ya no está disponible.' : 'La consulta o nota ya no está disponible.';
  if (apiError.code === 'validation_error') return 'El servidor rechazó los datos. Revisá los valores ingresados.';
  return apiError.message;
}

function toNumber(value: string) { return value === '' ? undefined : Number(value); }

const vitalDefaults: VitalSignsForm = {
  temperatura_c: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', presion_sistolica: '',
  presion_diastolica: '', saturacion_oxigeno: '', peso_kg: '', talla_cm: '', glucosa_mg_dl: '',
};

export function ConsultationDetailScreen({ patientId, consultationId }: { patientId: number; consultationId: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const [vitalOffset, setVitalOffset] = useState(0);
  const [noteOffset, setNoteOffset] = useState(0);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
  const consultation = useConsultation(consultationId);
  const vitals = useVitalSigns(consultationId, { limit: PAGE_SIZE, offset: vitalOffset });
  const notes = useClinicalNotes(consultationId, { limit: PAGE_SIZE, offset: noteOffset });
  const createVitals = useCreateVitalSigns(consultationId);
  const createNote = useCreateClinicalNote(consultationId);
  const updateNote = useUpdateClinicalNote(consultationId, editingNote?.id ?? 0);

  const vitalForm = useForm<VitalSignsForm>({ resolver: zodResolver(vitalSignsFormSchema), defaultValues: vitalDefaults });
  const noteForm = useForm<ClinicalNoteForm>({ resolver: zodResolver(clinicalNoteFormSchema), defaultValues: { contenido: '', activo: true } });

  useEffect(() => {
    noteForm.reset(editingNote ? { contenido: editingNote.contenido, activo: editingNote.activo } : { contenido: '', activo: true });
  }, [editingNote, noteForm]);

  if (!permissions.has('clinica:manage')) return <ErrorState title="Acceso restringido" message="No tenés permiso para consultar esta atención clínica." />;
  if (consultation.isLoading) return <LoadingState title="Cargando consulta" />;
  if (consultation.isError || !consultation.data) return <ErrorState title="Consulta no disponible" message="La consulta no existe o no tenés acceso." />;

  const item = consultation.data;
  const vitalPage = vitals.data;
  const notePage = notes.data;
  const vitalError = mutationError(createVitals.error, 'signs');
  const noteError = mutationError(editingNote ? updateNote.error : createNote.error, 'note');

  const submitVitals = vitalForm.handleSubmit(async (values) => {
    const payload: VitalSignsCreate = {
      temperatura_c: toNumber(values.temperatura_c),
      frecuencia_cardiaca: toNumber(values.frecuencia_cardiaca),
      frecuencia_respiratoria: toNumber(values.frecuencia_respiratoria),
      presion_sistolica: toNumber(values.presion_sistolica),
      presion_diastolica: toNumber(values.presion_diastolica),
      saturacion_oxigeno: toNumber(values.saturacion_oxigeno),
      peso_kg: toNumber(values.peso_kg),
      talla_cm: toNumber(values.talla_cm),
      glucosa_mg_dl: toNumber(values.glucosa_mg_dl),
    };
    await createVitals.mutateAsync(payload);
    vitalForm.reset(vitalDefaults);
    setVitalOffset(0);
  });

  const submitNote = noteForm.handleSubmit(async (values) => {
    if (editingNote) {
      await updateNote.mutateAsync({ contenido: values.contenido, activo: values.activo });
      setEditingNote(null);
    } else {
      await createNote.mutateAsync({ contenido: values.contenido, activo: values.activo });
      noteForm.reset({ contenido: '', activo: true });
    }
    setNoteOffset(0);
  });

  const detailRows = [
    ['Motivo', item.motivo], ['Síntomas', item.sintomas], ['Evaluación', item.evaluacion],
    ['Indicaciones', item.indicaciones], ['Observaciones', item.observaciones],
  ] as const;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">Volver</Button>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CONSULTA #{item.id}</Text>
            <Text style={styles.title}>{item.motivo ?? 'Consulta médica'}</Text>
            <Text style={styles.subtitle}>{formatDateTime(item.fecha_consulta)} · Profesional #{item.profesional_id}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {detailRows.map(([label, value]) => value ? <View key={label} style={styles.detailRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View> : null)}
          <Text style={[styles.status, item.activo ? styles.active : styles.inactive]}>{item.activo ? 'Consulta activa' : 'Consulta inactiva'}</Text>
          <Button
            onPress={() =>
              router.push(
                `/(staff)/patients/${patientId}/record/consultations/${item.id}/diagnoses?recordId=${item.expediente_id}` as Href,
              )
            }
            variant="secondary"
          >
            Diagnósticos
          </Button>
          <Button onPress={() => router.push(`/(staff)/patients/${patientId}/record/consultations/${item.id}/edit?recordId=${item.expediente_id}` as Href)} variant="secondary">Editar consulta</Button>
        </View>

        <ClinicalSection title="Signos vitales">
          {vitals.isLoading ? <LoadingState title="Cargando signos vitales" /> : null}
          {vitals.isError ? <ErrorState title="No se pudieron cargar los signos" message="Verificá el acceso a la consulta." /> : null}
          {!vitals.isLoading && !vitals.isError && vitalPage?.items.length === 0 ? <EmptyState title="Sin signos vitales" message="Todavía no hay registros para esta consulta." /> : null}
          {vitalPage?.items.map((record) => <VitalCard key={record.id} record={record} />)}
          {vitalPage && vitalPage.total > PAGE_SIZE ? <Pagination offset={vitalOffset} pageSize={PAGE_SIZE} total={vitalPage.total} onChange={setVitalOffset} /> : null}

          <Text style={styles.formTitle}>Registrar signos vitales</Text>
          {([
            ['temperatura_c', 'Temperatura (°C)', 'decimal-pad'], ['frecuencia_cardiaca', 'Frecuencia cardiaca', 'number-pad'],
            ['frecuencia_respiratoria', 'Frecuencia respiratoria', 'number-pad'], ['presion_sistolica', 'Presión sistólica', 'number-pad'],
            ['presion_diastolica', 'Presión diastólica', 'number-pad'], ['saturacion_oxigeno', 'Saturación O₂ (%)', 'number-pad'],
            ['peso_kg', 'Peso (kg)', 'decimal-pad'], ['talla_cm', 'Talla (cm)', 'decimal-pad'], ['glucosa_mg_dl', 'Glucosa (mg/dL)', 'number-pad'],
          ] as const).map(([name, label, keyboardType]) => (
            <Controller control={vitalForm.control} key={name} name={name} render={({ field }) => (
              <TextField accessibilityLabel={label} error={vitalForm.formState.errors[name]?.message} keyboardType={keyboardType} label={label} onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />
            )} />
          ))}
          {vitalError ? <ErrorBox message={vitalError} /> : null}
          <Button disabled={createVitals.isPending} loading={createVitals.isPending} onPress={submitVitals}>Guardar signos vitales</Button>
        </ClinicalSection>

        <ClinicalSection title="Notas clínicas">
          {notes.isLoading ? <LoadingState title="Cargando notas clínicas" /> : null}
          {notes.isError ? <ErrorState title="No se pudieron cargar las notas" message="Verificá el acceso a la consulta." /> : null}
          {!notes.isLoading && !notes.isError && notePage?.items.length === 0 ? <EmptyState title="Sin notas clínicas" message="Todavía no hay notas para esta consulta." /> : null}
          {notePage?.items.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteText}>{note.contenido}</Text>
              <Text style={styles.noteMeta}>Autor #{note.autor_id} · Creada {formatDateTime(note.created_at)}</Text>
              <Text style={styles.noteMeta}>Actualizada {formatDateTime(note.updated_at)} · {note.activo ? 'Activa' : 'Inactiva'}</Text>
              <Button onPress={() => setEditingNote(note)} variant="secondary">Editar nota</Button>
            </View>
          ))}
          {notePage && notePage.total > PAGE_SIZE ? <Pagination offset={noteOffset} pageSize={PAGE_SIZE} total={notePage.total} onChange={setNoteOffset} /> : null}

          <Text style={styles.formTitle}>{editingNote ? `Editar nota #${editingNote.id}` : 'Nueva nota clínica'}</Text>
          <Controller control={noteForm.control} name="contenido" render={({ field }) => (
            <TextField accessibilityLabel="Contenido de nota clínica" error={noteForm.formState.errors.contenido?.message} label="Contenido *" multiline onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />
          )} />
          {editingNote ? <Controller control={noteForm.control} name="activo" render={({ field }) => (
            <ChoiceField items={[{ id: 1, nombre: 'Activa' }, { id: 2, nombre: 'Inactiva' }]} label="Estado de la nota" onChange={(value) => field.onChange(value !== 2)} value={field.value ? 1 : 2} />
          )} /> : null}
          {noteError ? <ErrorBox message={noteError} /> : null}
          <Button disabled={createNote.isPending || updateNote.isPending} loading={createNote.isPending || updateNote.isPending} onPress={submitNote}>{editingNote ? 'Guardar nota' : 'Crear nota'}</Button>
          {editingNote ? <Button onPress={() => setEditingNote(null)} variant="ghost">Cancelar edición</Button> : null}
        </ClinicalSection>
      </ScrollView>
    </Screen>
  );
}

function ClinicalSection({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function ErrorBox({ message }: { message: string }) { return <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{message}</Text></View>; }

function Pagination({ offset, pageSize, total, onChange }: { offset: number; pageSize: number; total: number; onChange: (value: number) => void }) {
  return <View style={styles.pagination}><Button disabled={offset === 0} onPress={() => onChange(Math.max(0, offset - pageSize))} variant="secondary">Anterior</Button><Text style={styles.pageText}>{Math.floor(offset / pageSize) + 1} / {Math.ceil(total / pageSize)}</Text><Button disabled={offset + pageSize >= total} onPress={() => onChange(offset + pageSize)} variant="secondary">Siguiente</Button></View>;
}

function VitalCard({ record }: { record: import('../types/consultation.types').VitalSigns }) {
  const values = [
    record.temperatura_c != null ? `Temp ${record.temperatura_c} °C` : null,
    record.frecuencia_cardiaca != null ? `FC ${record.frecuencia_cardiaca}` : null,
    record.frecuencia_respiratoria != null ? `FR ${record.frecuencia_respiratoria}` : null,
    record.presion_sistolica != null && record.presion_diastolica != null ? `PA ${record.presion_sistolica}/${record.presion_diastolica}` : null,
    record.saturacion_oxigeno != null ? `SpO₂ ${record.saturacion_oxigeno}%` : null,
    record.peso_kg != null ? `Peso ${record.peso_kg} kg` : null,
    record.talla_cm != null ? `Talla ${record.talla_cm} cm` : null,
    record.glucosa_mg_dl != null ? `Glucosa ${record.glucosa_mg_dl} mg/dL` : null,
  ].filter(Boolean);
  return <View style={styles.vitalCard}><Text style={styles.vitalDate}>{formatDateTime(record.registrado_at)}</Text><Text style={styles.vitalValues}>{values.join(' · ')}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 12 },
  card: { backgroundColor: theme.color.surface, borderColor: theme.color.softBorder, borderRadius: theme.radius.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.lg },
  detailRow: { gap: 3 }, label: { color: theme.color.subtleText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, value: { color: theme.color.text, fontSize: 14, lineHeight: 21 },
  status: { alignSelf: 'flex-start', borderRadius: theme.radius.pill, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 }, active: { backgroundColor: '#DDF4E4', color: theme.color.success }, inactive: { backgroundColor: theme.color.surfaceMuted, color: theme.color.subtleText },
  section: { backgroundColor: theme.color.surface, borderColor: theme.color.softBorder, borderRadius: theme.radius.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.lg },
  sectionTitle: { color: theme.color.text, fontSize: 20, fontWeight: '900' }, formTitle: { color: theme.color.primaryPressed, fontSize: 16, fontWeight: '900', marginTop: theme.spacing.sm },
  vitalCard: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md, gap: 4, padding: theme.spacing.md }, vitalDate: { color: theme.color.subtleText, fontSize: 11 }, vitalValues: { color: theme.color.text, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  noteCard: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md, gap: 5, padding: theme.spacing.md }, noteText: { color: theme.color.text, fontSize: 14, lineHeight: 21 }, noteMeta: { color: theme.color.subtleText, fontSize: 11 },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md }, errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
  pagination: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' }, pageText: { color: theme.color.mutedText, fontSize: 12, fontWeight: '700' },
});
