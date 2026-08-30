import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { useCurrentProfessional } from '@/src/features/profile/hooks/use-professionals';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { MedicationChoiceField } from '../components/MedicationChoiceField';
import {
  useAdministrationRoutes,
  useCreatePrescriptionDetail,
  useDeletePrescriptionDetail,
  useMeasurementUnits,
  usePrescription,
  usePrescriptionMedications,
  usePrescriptionStatuses,
  useUpdatePrescription,
  useUpdatePrescriptionDetail,
} from '../hooks/use-prescriptions';
import {
  prescriptionDetailFormSchema,
  prescriptionHeaderFormSchema,
  type PrescriptionDetailForm,
  type PrescriptionHeaderForm,
} from '../schemas/prescription.schemas';
import type {
  PrescriptionDetail,
  PrescriptionDetailCreate,
  PrescriptionUpdate,
} from '../types/prescription.types';

const emptyDetail: PrescriptionDetailForm = {
  medicamento_id: '',
  unidad_medida_id: 0,
  via_administracion_id: 0,
  dosis: '',
  frecuencia: '',
  duracion_dias: '',
  cantidad_total: '',
  instrucciones: '',
};

function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function dateOnly(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function endOfDay(value: string) {
  return value ? `${value}T23:59:59` : null;
}

function errorMessage(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') {
    return 'Solo el profesional que emitió la receta puede modificarla o cambiar sus medicamentos.';
  }
  if (apiError.code === 'not_found') {
    return 'La receta, el detalle o un recurso seleccionado ya no está disponible.';
  }
  if (apiError.code === 'conflict' || apiError.code === 'validation_error') {
    return apiError.message;
  }
  return apiError.message;
}

export function PrescriptionDetailScreen({
  patientId,
  prescriptionId,
  recordId,
}: {
  patientId: number;
  prescriptionId: string;
  recordId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const currentProfessional = useCurrentProfessional();
  const prescription = usePrescription(patientId, prescriptionId, allowed);
  const statuses = usePrescriptionStatuses(allowed);
  const medications = usePrescriptionMedications(allowed);
  const routes = useAdministrationRoutes(allowed);
  const units = useMeasurementUnits(allowed);
  const updatePrescriptionMutation = useUpdatePrescription(
    patientId,
    prescriptionId,
    recordId,
  );
  const createDetail = useCreatePrescriptionDetail(patientId, prescriptionId, recordId);
  const deleteDetail = useDeletePrescriptionDetail(patientId, prescriptionId, recordId);
  const [editingDetailId, setEditingDetailId] = useState<string | 'new' | null>(null);
  const updateDetail = useUpdatePrescriptionDetail(
    patientId,
    prescriptionId,
    editingDetailId && editingDetailId !== 'new' ? editingDetailId : '',
    recordId,
  );

  const headerForm = useForm<PrescriptionHeaderForm>({
    resolver: zodResolver(prescriptionHeaderFormSchema),
    defaultValues: {
      estado_id: 0,
      titulo: '',
      vigencia_hasta: '',
      observaciones: '',
    },
  });
  const detailForm = useForm<PrescriptionDetailForm>({
    resolver: zodResolver(prescriptionDetailFormSchema),
    defaultValues: emptyDetail,
  });

  useEffect(() => {
    if (!prescription.data) return;
    headerForm.reset({
      estado_id: prescription.data.estado_id,
      titulo: prescription.data.titulo ?? '',
      vigencia_hasta: dateOnly(prescription.data.vigencia_hasta),
      observaciones: prescription.data.observaciones ?? '',
    });
  }, [headerForm, prescription.data]);

  useEffect(() => {
    if (!prescription.data || !editingDetailId) return;
    if (editingDetailId === 'new') {
      detailForm.reset(emptyDetail);
      return;
    }
    const detail = prescription.data.detalles.find(
      (item) => item.id === editingDetailId,
    );
    if (!detail) return;
    detailForm.reset({
      medicamento_id: detail.medicamento_id,
      unidad_medida_id: detail.unidad_medida_id,
      via_administracion_id: detail.via_administracion_id,
      dosis: detail.dosis,
      frecuencia: detail.frecuencia,
      duracion_dias: String(detail.duracion_dias),
      cantidad_total: String(detail.cantidad_total),
      instrucciones: detail.instrucciones ?? '',
    });
  }, [detailForm, editingDetailId, prescription.data]);

  const statusById = useMemo(
    () => new Map((statuses.data?.items ?? []).map((item) => [item.id, item.nombre])),
    [statuses.data],
  );
  const medicationById = useMemo(
    () => new Map((medications.data ?? []).map((item) => [item.id, item])),
    [medications.data],
  );
  const unitById = useMemo(
    () => new Map((units.data?.items ?? []).map((item) => [item.id, item.nombre])),
    [units.data],
  );
  const routeById = useMemo(
    () => new Map((routes.data?.items ?? []).map((item) => [item.id, item.nombre])),
    [routes.data],
  );

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar recetas clínicas."
      />
    );
  }
  if (
    prescription.isLoading ||
    currentProfessional.isLoading ||
    statuses.isLoading ||
    medications.isLoading ||
    routes.isLoading ||
    units.isLoading
  ) {
    return <LoadingState title="Cargando receta" />;
  }
  if (prescription.isError || !prescription.data) {
    return (
      <ErrorState
        title="Receta no disponible"
        message="La receta no existe o no está accesible para este usuario."
      />
    );
  }
  if (statuses.isError || medications.isError || routes.isError || units.isError) {
    return (
      <ErrorState
        title="Catálogos clínicos no disponibles"
        message="No se pudieron resolver estados, medicamentos, vías o unidades."
      />
    );
  }

  const item = prescription.data;
  const canEdit =
    currentProfessional.data?.id === item.profesional_id &&
    permissions.has('clinica:manage');
  const activeMedications = (medications.data ?? []).filter((medication) => medication.activo);
  const headerBusy =
    headerForm.formState.isSubmitting || updatePrescriptionMutation.isPending;
  const detailBusy =
    detailForm.formState.isSubmitting ||
    createDetail.isPending ||
    updateDetail.isPending ||
    deleteDetail.isPending;

  const saveHeader = headerForm.handleSubmit(async (values) => {
    const payload: PrescriptionUpdate = {
      estado_id: values.estado_id,
      titulo: nullable(values.titulo),
      vigencia_hasta: endOfDay(values.vigencia_hasta),
      observaciones: nullable(values.observaciones),
    };
    try {
      await updatePrescriptionMutation.mutateAsync(payload);
    } catch {
      // La mutación conserva el error para mostrarlo.
    }
  });

  const saveDetail = detailForm.handleSubmit(async (values) => {
    const payload: PrescriptionDetailCreate = {
      medicamento_id: values.medicamento_id,
      unidad_medida_id: values.unidad_medida_id,
      via_administracion_id: values.via_administracion_id,
      dosis: values.dosis.trim(),
      frecuencia: values.frecuencia.trim(),
      duracion_dias: Number(values.duracion_dias),
      cantidad_total: Number(values.cantidad_total),
      instrucciones: nullable(values.instrucciones),
    };
    try {
      if (editingDetailId === 'new') {
        await createDetail.mutateAsync(payload);
      } else if (editingDetailId) {
        await updateDetail.mutateAsync(payload);
      }
      setEditingDetailId(null);
    } catch {
      // La mutación conserva el error para mostrarlo.
    }
  });

  const confirmDelete = (detail: PrescriptionDetail) => {
    Alert.alert(
      'Eliminar medicamento de la receta',
      'FastAPI eliminará este detalle de receta. La receta principal se conserva.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteDetail.mutateAsync(detail.id);
          },
        },
      ],
    );
  };

  const serverError = errorMessage(
    updatePrescriptionMutation.error ??
      createDetail.error ??
      updateDetail.error ??
      deleteDetail.error,
  );

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
            <Text style={styles.eyebrow}>RECETA {item.id}</Text>
            <Text style={styles.title}>{item.titulo ?? 'Receta médica'}</Text>
            <Text style={styles.subtitle}>
              {item.profesional.persona.nombres} {item.profesional.persona.apellidos}
              {' · '}
              {item.profesional.especialidad}
            </Text>
          </View>
        </View>

        {!canEdit ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Esta receta fue emitida por otro profesional. Podés consultarla, pero el backend bloquea su edición y la de sus medicamentos.
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la receta</Text>
          <Text style={styles.meta}>
            Emitida: {new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(item.fecha_emision))}
            {item.consulta_id ? ` · Consulta #${item.consulta_id}` : ''}
          </Text>
          {canEdit ? (
            <>
              <Controller
                control={headerForm.control}
                name="estado_id"
                render={({ field }) => (
                  <ChoiceField
                    error={headerForm.formState.errors.estado_id?.message}
                    items={statuses.data?.items ?? []}
                    label="Estado *"
                    onChange={(value) => field.onChange(value ?? 0)}
                    value={field.value || undefined}
                  />
                )}
              />
              <Controller
                control={headerForm.control}
                name="titulo"
                render={({ field }) => (
                  <TextField
                    accessibilityLabel="Título de receta"
                    error={headerForm.formState.errors.titulo?.message}
                    label="Título"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                )}
              />
              <Controller
                control={headerForm.control}
                name="vigencia_hasta"
                render={({ field }) => (
                  <TextField
                    accessibilityLabel="Vigencia de receta"
                    error={headerForm.formState.errors.vigencia_hasta?.message}
                    label="Vigencia hasta"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="AAAA-MM-DD"
                    value={field.value}
                  />
                )}
              />
              <Controller
                control={headerForm.control}
                name="observaciones"
                render={({ field }) => (
                  <TextField
                    accessibilityLabel="Observaciones de receta"
                    label="Observaciones"
                    multiline
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                )}
              />
              <Button disabled={headerBusy} loading={headerBusy} onPress={saveHeader}>
                Guardar receta
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.value}>
                Estado: {statusById.get(item.estado_id) ?? `#${item.estado_id}`}
              </Text>
              <Text style={styles.value}>
                Vigencia: {item.vigencia_hasta ? dateOnly(item.vigencia_hasta) : 'No indicada'}
              </Text>
              {item.observaciones ? <Text style={styles.value}>{item.observaciones}</Text> : null}
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicamentos</Text>
            {canEdit ? (
              <Button
                disabled={activeMedications.length === 0}
                onPress={() => setEditingDetailId('new')}
                variant="secondary"
              >
                Agregar
              </Button>
            ) : null}
          </View>
          {item.detalles.length === 0 ? (
            <EmptyState
              title="Sin medicamentos"
              message="Esta receta no contiene detalles de medicamentos."
            />
          ) : null}
          {item.detalles.map((detail) => {
            const medication = medicationById.get(detail.medicamento_id);
            return (
              <View key={detail.id} style={styles.detailCard}>
                <Text style={styles.detailTitle}>
                  {medication?.nombre ?? `Medicamento ${detail.medicamento_id}`}
                </Text>
                <Text style={styles.meta}>
                  {detail.dosis} · {detail.frecuencia} · {detail.duracion_dias} días
                </Text>
                <Text style={styles.meta}>
                  Cantidad: {detail.cantidad_total}
                  {' · '}
                  {unitById.get(detail.unidad_medida_id) ?? `Unidad #${detail.unidad_medida_id}`}
                  {' · '}
                  {routeById.get(detail.via_administracion_id) ?? `Vía #${detail.via_administracion_id}`}
                </Text>
                {detail.instrucciones ? (
                  <Text style={styles.value}>{detail.instrucciones}</Text>
                ) : null}
                {canEdit ? (
                  <View style={styles.actions}>
                    <Button
                      accessibilityLabel={`Editar medicamento ${detail.id}`}
                      onPress={() => setEditingDetailId(detail.id)}
                      variant="secondary"
                    >
                      Editar
                    </Button>
                    <Button
                      accessibilityLabel={`Eliminar medicamento ${detail.id}`}
                      disabled={detailBusy}
                      onPress={() => confirmDelete(detail)}
                      variant="ghost"
                    >
                      Eliminar
                    </Button>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {canEdit && editingDetailId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {editingDetailId === 'new' ? 'Agregar medicamento' : 'Editar medicamento'}
            </Text>
            <Controller
              control={detailForm.control}
              name="medicamento_id"
              render={({ field }) => (
                <MedicationChoiceField
                  error={detailForm.formState.errors.medicamento_id?.message}
                  items={activeMedications}
                  label="Medicamento *"
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <Controller
              control={detailForm.control}
              name="unidad_medida_id"
              render={({ field }) => (
                <ChoiceField
                  error={detailForm.formState.errors.unidad_medida_id?.message}
                  items={units.data?.items ?? []}
                  label="Unidad *"
                  onChange={(value) => field.onChange(value ?? 0)}
                  value={field.value || undefined}
                />
              )}
            />
            <Controller
              control={detailForm.control}
              name="via_administracion_id"
              render={({ field }) => (
                <ChoiceField
                  error={detailForm.formState.errors.via_administracion_id?.message}
                  items={routes.data?.items ?? []}
                  label="Vía *"
                  onChange={(value) => field.onChange(value ?? 0)}
                  value={field.value || undefined}
                />
              )}
            />
            {([
              ['dosis', 'Dosis *'],
              ['frecuencia', 'Frecuencia *'],
              ['duracion_dias', 'Duración (días) *'],
              ['cantidad_total', 'Cantidad total *'],
            ] as const).map(([name, label]) => (
              <Controller
                control={detailForm.control}
                key={name}
                name={name}
                render={({ field }) => (
                  <TextField
                    accessibilityLabel={label}
                    error={detailForm.formState.errors[name]?.message}
                    keyboardType={
                      name === 'duracion_dias' || name === 'cantidad_total'
                        ? 'number-pad'
                        : 'default'
                    }
                    label={label}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                )}
              />
            ))}
            <Controller
              control={detailForm.control}
              name="instrucciones"
              render={({ field }) => (
                <TextField
                  accessibilityLabel="Instrucciones"
                  label="Instrucciones"
                  multiline
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value}
                />
              )}
            />
            <Button disabled={detailBusy} loading={detailBusy} onPress={saveDetail}>
              Guardar medicamento
            </Button>
            <Button
              disabled={detailBusy}
              onPress={() => setEditingDetailId(null)}
              variant="ghost"
            >
              Cancelar
            </Button>
          </View>
        ) : null}

        {serverError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 12 },
  notice: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md, padding: theme.spacing.md },
  noticeText: { color: theme.color.mutedText, fontSize: 13, lineHeight: 19 },
  section: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  meta: { color: theme.color.mutedText, fontSize: 12, lineHeight: 18 },
  value: { color: theme.color.text, fontSize: 14, lineHeight: 20 },
  detailCard: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md, gap: 5, padding: theme.spacing.md },
  detailTitle: { color: theme.color.text, fontSize: 15, fontWeight: '900' },
  actions: { gap: theme.spacing.sm },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md },
  errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
});
