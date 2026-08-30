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
  useCreateDiagnosis,
  useDeleteDiagnosis,
  useDiagnoses,
  useDiagnosisTypes,
  useUpdateDiagnosis,
} from '../hooks/use-diagnoses';
import {
  diagnosisFormSchema,
  type DiagnosisForm,
  type DiagnosisFormInput,
} from '../schemas/diagnosis.schemas';
import type { Diagnosis, DiagnosisCreate, DiagnosisUpdate } from '../types/diagnosis.types';

const PAGE_SIZE = 20;

const emptyValues: DiagnosisFormInput = {
  tipo_diagnostico_id: 0,
  descripcion: '',
  es_principal: false,
  fecha_diagnostico: '',
  activo: true,
};

function diagnosisError(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') {
    return 'No tenés permiso para modificar diagnósticos clínicos.';
  }
  if (apiError.code === 'not_found') {
    return 'La consulta, el diagnóstico o el tipo seleccionado ya no está disponible.';
  }
  if (apiError.code === 'conflict') {
    return apiError.message;
  }
  if (apiError.code === 'validation_error') {
    return 'FastAPI rechazó los datos del diagnóstico. Revisá el formulario.';
  }
  return apiError.message;
}

export function DiagnosesScreen({
  patientId,
  recordId,
  consultationId,
}: {
  patientId: number;
  recordId: number;
  consultationId: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Diagnosis | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Diagnosis | null>(null);
  const diagnoses = useDiagnoses(
    patientId,
    recordId,
    consultationId,
    { limit: PAGE_SIZE, offset },
    allowed,
  );
  const types = useDiagnosisTypes(allowed);
  const creation = useCreateDiagnosis(patientId, recordId, consultationId);
  const update = useUpdateDiagnosis(
    patientId,
    recordId,
    consultationId,
    editing?.id ?? 0,
  );
  const deletion = useDeleteDiagnosis(patientId, recordId, consultationId);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<DiagnosisFormInput, unknown, DiagnosisForm>({
    resolver: zodResolver(diagnosisFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    reset(
      editing
        ? {
            tipo_diagnostico_id: editing.tipo_diagnostico_id,
            descripcion: editing.descripcion,
            es_principal: editing.es_principal,
            fecha_diagnostico: editing.fecha_diagnostico,
            activo: editing.activo,
          }
        : emptyValues,
    );
  }, [editing, reset]);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar ni modificar diagnósticos."
      />
    );
  }
  if (diagnoses.isLoading || types.isLoading) {
    return <LoadingState title="Cargando diagnósticos" />;
  }
  if (diagnoses.isError) {
    return (
      <ErrorState
        title="Diagnósticos no disponibles"
        message="No se pudo consultar los diagnósticos de esta consulta."
      />
    );
  }
  if (types.isError) {
    return (
      <ErrorState
        title="Tipos de diagnóstico no disponibles"
        message="No se pudo cargar el catálogo real de FastAPI."
      />
    );
  }

  const page = diagnoses.data;
  const typeById = new Map(
    (types.data?.items ?? []).map((item) => [item.id, item.nombre]),
  );
  const mutation = editing ? update : creation;
  const busy = isSubmitting || mutation.isPending;

  const submit = handleSubmit(async (values) => {
    const base = {
      tipo_diagnostico_id: values.tipo_diagnostico_id,
      descripcion: values.descripcion,
      es_principal: values.es_principal,
      activo: values.activo,
      ...(values.fecha_diagnostico
        ? { fecha_diagnostico: values.fecha_diagnostico }
        : {}),
    };
    try {
      if (editing) {
        await update.mutateAsync(base satisfies DiagnosisUpdate);
        setEditing(null);
      } else {
        await creation.mutateAsync(base satisfies DiagnosisCreate);
        reset(emptyValues);
      }
      setOffset(0);
    } catch {
      // React Query conserva el error para renderizarlo debajo del formulario.
    }
  });

  const deleteSelectedDiagnosis = async () => {
    if (!pendingDelete) return;
    try {
      await deletion.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // React Query conserva el error para renderizarlo debajo del formulario.
    }
  };

  const serverError = diagnosisError(mutation.error ?? deletion.error);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
            Volver
          </Button>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CONSULTA #{consultationId}</Text>
            <Text style={styles.title}>Diagnósticos</Text>
            <Text style={styles.subtitle}>Expediente #{recordId}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnósticos registrados</Text>
          {page?.items.length === 0 ? (
            <EmptyState
              title="Sin diagnósticos"
              message="Todavía no hay diagnósticos documentados para esta consulta."
            />
          ) : null}
          {page?.items.map((diagnosis) => (
            <View key={diagnosis.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>
                  {diagnosis.es_principal ? 'Principal · ' : ''}
                  Diagnóstico #{diagnosis.id}
                </Text>
                <Text style={[styles.badge, diagnosis.activo ? styles.active : styles.inactive]}>
                  {diagnosis.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <Text style={styles.meta}>
                Tipo: {typeById.get(diagnosis.tipo_diagnostico_id) ?? `#${diagnosis.tipo_diagnostico_id}`}
                {' · '}
                {diagnosis.fecha_diagnostico}
              </Text>
              <Text style={styles.description}>{diagnosis.descripcion}</Text>
              <View style={styles.actions}>
                <Button
                  accessibilityLabel={`Editar diagnóstico ${diagnosis.id}`}
                  onPress={() => setEditing(diagnosis)}
                  variant="secondary"
                >
                  Editar
                </Button>
                {diagnosis.activo ? (
                  <Button
                    accessibilityLabel={`Crear condición desde diagnóstico ${diagnosis.id}`}
                    onPress={() =>
                      router.push(
                        `/(staff)/patients/${patientId}/record/conditions/new?recordId=${recordId}&diagnosisId=${diagnosis.id}` as Href,
                      )
                    }
                    variant="secondary"
                  >
                    Crear condición asociada
                  </Button>
                ) : null}
                <Button
                  accessibilityLabel={`Eliminar diagnóstico ${diagnosis.id}`}
                  disabled={deletion.isPending}
                  onPress={() => setPendingDelete(diagnosis)}
                  variant="ghost"
                >
                  Eliminar
                </Button>
              </View>
              {pendingDelete?.id === diagnosis.id ? (
                <View accessibilityRole="alert" style={styles.deleteConfirmation}>
                  <Text style={styles.deleteTitle}>Eliminar diagnóstico</Text>
                  <Text style={styles.deleteMessage}>
                    El backend realizará un borrado lógico. Esta acción no elimina físicamente el registro clínico.
                  </Text>
                  <View style={styles.deleteActions}>
                    <Button
                      disabled={deletion.isPending}
                      onPress={() => setPendingDelete(null)}
                      variant="ghost"
                    >
                      Cancelar
                    </Button>
                    <Button
                      accessibilityLabel={`Confirmar eliminación de diagnóstico ${diagnosis.id}`}
                      disabled={deletion.isPending}
                      loading={deletion.isPending}
                      onPress={() => {
                        void deleteSelectedDiagnosis();
                      }}
                      variant="danger"
                    >
                      Eliminar
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
          {page && page.total > PAGE_SIZE ? (
            <View style={styles.pagination}>
              <Button
                disabled={offset === 0}
                onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                variant="secondary"
              >
                Anterior
              </Button>
              <Text style={styles.pageText}>
                {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(page.total / PAGE_SIZE)}
              </Text>
              <Button
                disabled={offset + PAGE_SIZE >= page.total}
                onPress={() => setOffset(offset + PAGE_SIZE)}
                variant="secondary"
              >
                Siguiente
              </Button>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {editing ? `Editar diagnóstico #${editing.id}` : 'Nuevo diagnóstico'}
          </Text>
          <Controller
            control={control}
            name="tipo_diagnostico_id"
            render={({ field }) => (
              <ChoiceField
                error={errors.tipo_diagnostico_id?.message}
                items={types.data?.items ?? []}
                label="Tipo de diagnóstico *"
                onChange={(value) => field.onChange(value ?? 0)}
                value={field.value || undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="descripcion"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Descripción del diagnóstico"
                error={errors.descripcion?.message}
                label="Descripción *"
                multiline
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Hallazgo o conclusión clínica"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="fecha_diagnostico"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Fecha del diagnóstico"
                error={errors.fecha_diagnostico?.message}
                label="Fecha"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="AAAA-MM-DD"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="es_principal"
            render={({ field }) => (
              <ChoiceField
                items={[
                  { id: 1, nombre: 'Principal' },
                  { id: 2, nombre: 'Secundario' },
                ]}
                label="Prioridad"
                onChange={(value) => field.onChange(value === 1)}
                value={field.value ? 1 : 2}
              />
            )}
          />
          {editing ? (
            <Controller
              control={control}
              name="activo"
              render={({ field }) => (
                <ChoiceField
                  items={[
                    { id: 1, nombre: 'Activo' },
                    { id: 2, nombre: 'Inactivo' },
                  ]}
                  label="Estado del registro"
                  onChange={(value) => field.onChange(value !== 2)}
                  value={field.value ? 1 : 2}
                />
              )}
            />
          ) : null}
          {serverError ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}
          <Button disabled={busy} loading={busy} onPress={submit}>
            {editing ? 'Guardar cambios' : 'Guardar diagnóstico'}
          </Button>
          {editing ? (
            <Button disabled={busy} onPress={() => setEditing(null)} variant="ghost">
              Cancelar edición
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 12 },
  section: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: { color: theme.color.text, fontSize: 19, fontWeight: '900' },
  card: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardTitle: { color: theme.color.text, flex: 1, fontSize: 15, fontWeight: '900' },
  badge: {
    borderRadius: theme.radius.pill,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  active: { backgroundColor: '#DDF4E4', color: theme.color.success },
  inactive: { backgroundColor: theme.color.surface, color: theme.color.subtleText },
  meta: { color: theme.color.subtleText, fontSize: 11 },
  description: { color: theme.color.text, fontSize: 14, lineHeight: 21 },
  actions: { gap: theme.spacing.sm },
  deleteConfirmation: {
    backgroundColor: theme.color.dangerSoft,
    borderColor: theme.color.danger,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  deleteTitle: { color: theme.color.danger, fontSize: 14, fontWeight: '900' },
  deleteMessage: { color: theme.color.text, fontSize: 13, lineHeight: 19 },
  deleteActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  pageText: { color: theme.color.mutedText, fontSize: 12, fontWeight: '700' },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md },
  errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
});
