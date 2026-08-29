import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { useCurrentProfessional } from '@/src/features/profile/hooks/use-professionals';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { useConsultation, useConsultationReasons, useCreateConsultation, useUpdateConsultation } from '../hooks/use-consultations';
import { consultationFormSchema, type ConsultationForm, type ConsultationFormInput } from '../schemas/consultation.schema';
import type { ConsultationCreate, ConsultationUpdate } from '../types/consultation.types';

function serverMessage(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') return 'No tenés permiso para guardar consultas clínicas.';
  if (apiError.code === 'not_found') return 'El expediente, paciente, profesional o motivo seleccionado ya no está disponible.';
  if (apiError.code === 'validation_error') return 'FastAPI rechazó uno o más datos. Revisá el formulario.';
  return apiError.message;
}

const emptyValues: ConsultationFormInput = {
  motivo_consulta_id: undefined,
  fecha_consulta: '',
  motivo: '',
  sintomas: '',
  evaluacion: '',
  indicaciones: '',
  observaciones: '',
  activo: true,
};

function nullable(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function ConsultationFormScreen({ patientId, recordId, consultationId }: { patientId: number; recordId: number; consultationId?: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const currentProfessional = useCurrentProfessional();
  const reasons = useConsultationReasons();
  const detail = useConsultation(consultationId ?? 0);
  const creation = useCreateConsultation();
  const update = useUpdateConsultation(consultationId ?? 0);
  const isEditing = typeof consultationId === 'number';

  const { control, formState: { errors, isSubmitting }, handleSubmit, reset } = useForm<ConsultationFormInput, unknown, ConsultationForm>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: emptyValues,
  });

  const loadedConsultationId = useRef<number | null>(null);
  useEffect(() => {
    if (!isEditing || !detail.data || loadedConsultationId.current === detail.data.id) return;
    loadedConsultationId.current = detail.data.id;
    reset({
      motivo_consulta_id: detail.data.motivo_consulta_id ?? undefined,
      fecha_consulta: detail.data.fecha_consulta,
      motivo: detail.data.motivo ?? '',
      sintomas: detail.data.sintomas ?? '',
      evaluacion: detail.data.evaluacion ?? '',
      indicaciones: detail.data.indicaciones ?? '',
      observaciones: detail.data.observaciones ?? '',
      activo: detail.data.activo,
    });
  }, [detail.data, isEditing, reset]);

  if (!permissions.has('clinica:manage')) return <ErrorState title="Acceso restringido" message="No tenés permiso para modificar consultas clínicas." />;
  if (currentProfessional.isLoading || reasons.isLoading || (isEditing && detail.isLoading)) return <LoadingState title="Preparando consulta" />;
  if (currentProfessional.isError || !currentProfessional.data) return <ErrorState title="Perfil profesional no disponible" message="La sesión no pudo vincularse con un profesional de salud." />;
  if (reasons.isError) return <ErrorState title="No se pudieron cargar los motivos" message="Intentá nuevamente antes de registrar la consulta." />;
  if (isEditing && (detail.isError || !detail.data)) return <ErrorState title="Consulta no disponible" message="La consulta no existe o no tenés acceso." />;

  const professionalId = currentProfessional.data.id;
  const mutation = isEditing ? update : creation;
  const busy = isSubmitting || mutation.isPending;
  const onSubmit = handleSubmit(async (values) => {
    if (isEditing && detail.data) {
      const payload: ConsultationUpdate = {
        profesional_id: professionalId,
        motivo_consulta_id: values.motivo_consulta_id ?? null,
        fecha_consulta: values.fecha_consulta || null,
        motivo: values.motivo,
        sintomas: nullable(values.sintomas),
        evaluacion: nullable(values.evaluacion),
        indicaciones: nullable(values.indicaciones),
        observaciones: nullable(values.observaciones),
        activo: values.activo,
      };
      const saved = await update.mutateAsync(payload);
      router.replace(`/(staff)/patients/${patientId}/record/consultations/${saved.id}` as Href);
      return;
    }

    const payload: ConsultationCreate = {
      expediente_id: recordId,
      paciente_id: patientId,
      profesional_id: professionalId,
      motivo_consulta_id: values.motivo_consulta_id ?? null,
      ...(values.fecha_consulta ? { fecha_consulta: values.fecha_consulta } : {}),
      motivo: values.motivo,
      sintomas: nullable(values.sintomas),
      evaluacion: nullable(values.evaluacion),
      indicaciones: nullable(values.indicaciones),
      observaciones: nullable(values.observaciones),
      activo: values.activo,
    };
    const saved = await creation.mutateAsync(payload);
    router.replace(`/(staff)/patients/${patientId}/record/consultations/${saved.id}` as Href);
  });

  const error = serverMessage(mutation.error);

  return (
    <Screen>
      <View style={styles.header}>
        <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">Volver</Button>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{isEditing ? 'Editar consulta' : 'Nueva consulta'}</Text>
          <Text style={styles.subtitle}>Expediente #{recordId} · Profesional #{professionalId}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Controller control={control} name="motivo_consulta_id" render={({ field }) => (
          <ChoiceField clearLabel="Sin catálogo" items={reasons.data?.items ?? []} label="Motivo catalogado" onChange={field.onChange} optional value={field.value} />
        )} />
        <Controller control={control} name="motivo" render={({ field }) => (
          <TextField accessibilityLabel="Motivo de consulta" error={errors.motivo?.message} label="Motivo de consulta *" multiline onBlur={field.onBlur} onChangeText={field.onChange} placeholder="Describí el motivo principal" value={field.value} />
        )} />
        <Controller control={control} name="fecha_consulta" render={({ field }) => (
          <TextField accessibilityLabel="Fecha de consulta" error={errors.fecha_consulta?.message} label="Fecha y hora" onBlur={field.onBlur} onChangeText={field.onChange} placeholder="Opcional; FastAPI asigna la fecha si se deja vacío" value={field.value} />
        )} />
        {(['sintomas', 'evaluacion', 'indicaciones', 'observaciones'] as const).map((name) => (
          <Controller control={control} key={name} name={name} render={({ field }) => (
            <TextField
              accessibilityLabel={name === 'sintomas' ? 'Síntomas' : name === 'evaluacion' ? 'Evaluación' : name === 'indicaciones' ? 'Indicaciones' : 'Observaciones'}
              error={errors[name]?.message}
              label={name === 'sintomas' ? 'Síntomas' : name === 'evaluacion' ? 'Evaluación clínica' : name === 'indicaciones' ? 'Indicaciones' : 'Observaciones'}
              multiline
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Opcional según contrato J03"
              value={field.value ?? ''}
            />
          )} />
        ))}
        {isEditing ? (
          <Controller control={control} name="activo" render={({ field }) => (
            <ChoiceField
              items={[{ id: 1, nombre: 'Activa' }, { id: 2, nombre: 'Inactiva' }]}
              label="Estado"
              onChange={(value) => field.onChange(value !== 2)}
              value={field.value ? 1 : 2}
            />
          )} />
        ) : null}
        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        <Button disabled={busy} icon="save-outline" loading={busy} onPress={onSubmit}>{isEditing ? 'Guardar cambios' : 'Registrar consulta'}</Button>
        <Button disabled={busy} onPress={() => router.back()} variant="secondary">Cancelar</Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 12 },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl, paddingTop: theme.spacing.lg },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md },
  errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
});
