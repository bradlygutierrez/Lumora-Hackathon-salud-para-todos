import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useMedicalRecordSummary } from '@/src/features/medical-records/hooks/use-medical-record';
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
  useCreatePrescription,
  useMeasurementUnits,
  usePrescriptionMedications,
  usePrescriptionStatuses,
} from '../hooks/use-prescriptions';
import {
  prescriptionCreateFormSchema,
  type PrescriptionCreateForm,
} from '../schemas/prescription.schemas';
import type { PrescriptionCreate } from '../types/prescription.types';

const emptyDetail = {
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

function endOfDay(value: string) {
  return value ? `${value}T23:59:59` : null;
}

function prescriptionError(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') {
    return 'FastAPI rechazó la identidad profesional o no tenés permiso para emitir esta receta.';
  }
  if (apiError.code === 'not_found') {
    return 'El paciente, la consulta o un recurso clínico seleccionado ya no está disponible.';
  }
  if (apiError.code === 'conflict') {
    return apiError.message;
  }
  if (apiError.code === 'validation_error') {
    return 'FastAPI rechazó la receta. Revisá los datos y cantidades.';
  }
  return apiError.message;
}

export function PrescriptionCreateScreen({
  patientId,
  recordId,
}: {
  patientId: number;
  recordId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const professional = useCurrentProfessional();
  const summary = useMedicalRecordSummary(patientId);
  const statuses = usePrescriptionStatuses(allowed);
  const medications = usePrescriptionMedications(allowed);
  const routes = useAdministrationRoutes(allowed);
  const units = useMeasurementUnits(allowed);
  const resolvedRecordId = recordId ?? summary.data?.expediente?.id;
  const creation = useCreatePrescription(patientId, resolvedRecordId);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<PrescriptionCreateForm>({
    resolver: zodResolver(prescriptionCreateFormSchema),
    defaultValues: {
      estado_id: 0,
      titulo: '',
      consulta_id: undefined,
      vigencia_hasta: '',
      observaciones: '',
      detalles: [{ ...emptyDetail }],
    },
  });
  const { append, fields, remove } = useFieldArray({ control, name: 'detalles' });

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para emitir recetas clínicas."
      />
    );
  }
  if (
    professional.isLoading ||
    summary.isLoading ||
    statuses.isLoading ||
    medications.isLoading ||
    routes.isLoading ||
    units.isLoading
  ) {
    return <LoadingState title="Preparando prescripción" />;
  }
  if (!professional.data) {
    return (
      <ErrorState
        title="Perfil profesional no disponible"
        message="Tu usuario clínico no está vinculado a un ProfesionalSalud. FastAPI no permite emitir recetas sin esa identidad."
      />
    );
  }
  if (statuses.isError || medications.isError || routes.isError || units.isError) {
    return (
      <ErrorState
        title="Catálogos clínicos no disponibles"
        message="No se pudieron cargar medicamentos, estados, vías o unidades desde FastAPI."
      />
    );
  }

  const activeMedications = (medications.data ?? []).filter((item) => item.activo);
  if (activeMedications.length === 0) {
    return (
      <EmptyState
        title="Sin medicamentos disponibles"
        message="El catálogo de medicamentos no contiene elementos activos para prescribir."
      />
    );
  }

  const consultationChoices =
    summary.data?.consultas
      .filter(
        (item) => item.consulta.profesional_id === professional.data.id,
      )
      .map((item) => ({
        id: item.consulta.id,
        nombre: `Consulta #${item.consulta.id} · ${item.consulta.motivo ?? item.consulta.fecha_consulta.slice(0, 10)}`,
      })) ?? [];

  const busy = isSubmitting || creation.isPending;
  const submit = handleSubmit(async (values) => {
    const payload: PrescriptionCreate = {
      paciente_id: patientId,
      profesional_id: professional.data.id,
      estado_id: values.estado_id,
      consulta_id: values.consulta_id ?? null,
      titulo: nullable(values.titulo),
      vigencia_hasta: endOfDay(values.vigencia_hasta),
      observaciones: nullable(values.observaciones),
      detalles: values.detalles.map((detail) => ({
        medicamento_id: detail.medicamento_id,
        unidad_medida_id: detail.unidad_medida_id,
        via_administracion_id: detail.via_administracion_id,
        dosis: detail.dosis.trim(),
        frecuencia: detail.frecuencia.trim(),
        duracion_dias: Number(detail.duracion_dias),
        cantidad_total: Number(detail.cantidad_total),
        instrucciones: nullable(detail.instrucciones),
      })),
    };
    try {
      const created = await creation.mutateAsync(payload);
      const query = resolvedRecordId ? `?recordId=${resolvedRecordId}` : '';
      router.replace(
        `/(staff)/patients/${patientId}/prescriptions/${created.id}${query}` as Href,
      );
    } catch {
      // El error permanece en la mutación y se renderiza debajo del formulario.
    }
  });

  const serverError = prescriptionError(creation.error);

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
            <Text style={styles.eyebrow}>PACIENTE #{patientId}</Text>
            <Text style={styles.title}>Nueva receta</Text>
            <Text style={styles.subtitle}>
              Profesional: {professional.data.persona.nombres} {professional.data.persona.apellidos}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la receta</Text>
          <Controller
            control={control}
            name="estado_id"
            render={({ field }) => (
              <ChoiceField
                error={errors.estado_id?.message}
                items={statuses.data?.items ?? []}
                label="Estado de receta *"
                onChange={(value) => field.onChange(value ?? 0)}
                value={field.value || undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="titulo"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Título de receta"
                error={errors.titulo?.message}
                label="Título"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Ej. Control antihipertensivo"
                value={field.value}
              />
            )}
          />
          {consultationChoices.length > 0 ? (
            <Controller
              control={control}
              name="consulta_id"
              render={({ field }) => (
                <ChoiceField
                  items={consultationChoices}
                  label="Consulta asociada"
                  onChange={field.onChange}
                  optional
                  value={field.value}
                />
              )}
            />
          ) : (
            <Text style={styles.noticeText}>
              No hay consultas de este paciente asociadas al profesional autenticado. La receta puede emitirse sin consulta.
            </Text>
          )}
          <Controller
            control={control}
            name="vigencia_hasta"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Vigencia de receta"
                error={errors.vigencia_hasta?.message}
                label="Vigencia hasta"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="AAAA-MM-DD"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
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
        </View>

        {fields.map((field, index) => (
          <View key={field.id} style={styles.section}>
            <View style={styles.medicationHeader}>
              <Text style={styles.sectionTitle}>Medicamento {index + 1}</Text>
              <Button
                disabled={fields.length === 1 || busy}
                onPress={() => remove(index)}
                variant="ghost"
              >
                Quitar
              </Button>
            </View>
            <Controller
              control={control}
              name={`detalles.${index}.medicamento_id`}
              render={({ field: medicationField }) => (
                <MedicationChoiceField
                  error={errors.detalles?.[index]?.medicamento_id?.message}
                  items={activeMedications}
                  label="Medicamento *"
                  onChange={medicationField.onChange}
                  value={medicationField.value}
                />
              )}
            />
            <Controller
              control={control}
              name={`detalles.${index}.unidad_medida_id`}
              render={({ field: unitField }) => (
                <ChoiceField
                  error={errors.detalles?.[index]?.unidad_medida_id?.message}
                  items={units.data?.items ?? []}
                  label="Unidad de medida *"
                  onChange={(value) => unitField.onChange(value ?? 0)}
                  value={unitField.value || undefined}
                />
              )}
            />
            <Controller
              control={control}
              name={`detalles.${index}.via_administracion_id`}
              render={({ field: routeField }) => (
                <ChoiceField
                  error={errors.detalles?.[index]?.via_administracion_id?.message}
                  items={routes.data?.items ?? []}
                  label="Vía de administración *"
                  onChange={(value) => routeField.onChange(value ?? 0)}
                  value={routeField.value || undefined}
                />
              )}
            />
            {([
              ['dosis', 'Dosis *', 'Dosis del medicamento'],
              ['frecuencia', 'Frecuencia *', 'Frecuencia del medicamento'],
              ['duracion_dias', 'Duración (días) *', 'Duración del medicamento'],
              ['cantidad_total', 'Cantidad total *', 'Cantidad total del medicamento'],
            ] as const).map(([name, label, accessibilityLabel]) => (
              <Controller
                control={control}
                key={name}
                name={`detalles.${index}.${name}`}
                render={({ field: textField }) => (
                  <TextField
                    accessibilityLabel={`${accessibilityLabel} ${index + 1}`}
                    error={errors.detalles?.[index]?.[name]?.message}
                    keyboardType={
                      name === 'duracion_dias' || name === 'cantidad_total'
                        ? 'number-pad'
                        : 'default'
                    }
                    label={label}
                    onBlur={textField.onBlur}
                    onChangeText={textField.onChange}
                    value={textField.value}
                  />
                )}
              />
            ))}
            <Controller
              control={control}
              name={`detalles.${index}.instrucciones`}
              render={({ field: instructionField }) => (
                <TextField
                  accessibilityLabel={`Instrucciones del medicamento ${index + 1}`}
                  label="Instrucciones"
                  multiline
                  onBlur={instructionField.onBlur}
                  onChangeText={instructionField.onChange}
                  value={instructionField.value}
                />
              )}
            />
          </View>
        ))}

        <Button
          disabled={busy}
          icon="add-outline"
          onPress={() => append({ ...emptyDetail })}
          variant="secondary"
        >
          Agregar otro medicamento
        </Button>

        {serverError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button disabled={busy} loading={busy} onPress={submit}>
          Emitir receta
        </Button>
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
  section: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  medicationHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  noticeText: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    color: theme.color.mutedText,
    fontSize: 12,
    lineHeight: 18,
    padding: theme.spacing.md,
  },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md },
  errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
});
