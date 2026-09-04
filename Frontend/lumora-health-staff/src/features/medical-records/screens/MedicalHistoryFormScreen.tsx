import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { Button } from '@/src/shared/components/Button';
import {
  ErrorState,
  LoadingState,
} from '@/src/shared/components/RemoteState';
import { TextField } from '@/src/shared/components/TextField';
import { DateField } from '@/src/shared/components/DateField';
import { theme } from '@/src/shared/constants/theme';
import { ClinicalFormShell } from '../components/ClinicalFormShell';
import { structuredHistoryErrorMessage } from '../components/structured-history.ui';
import {
  useCreateMedicalHistoryEntry,
  useMedicalHistoryEntry,
  useMedicalHistoryTypes,
  useUpdateMedicalHistoryEntry,
} from '../hooks/use-structured-history';
import {
  medicalHistoryFormSchema,
  type MedicalHistoryForm,
  type MedicalHistoryFormInput,
} from '../schemas/structured-history.schemas';
import type {
  MedicalHistoryCreate,
  MedicalHistoryUpdate,
} from '../types/structured-history.types';

const emptyValues: MedicalHistoryFormInput = {
  tipo_antecedente_id: 0,
  descripcion: '',
  fecha: '',
  activo: true,
};

export function MedicalHistoryFormScreen({
  patientId,
  recordId,
  historyId,
}: {
  patientId: number;
  recordId: number;
  historyId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const isEditing = typeof historyId === 'number';
  const types = useMedicalHistoryTypes(allowed);
  const detail = useMedicalHistoryEntry(
    recordId,
    historyId ?? 0,
    allowed && isEditing,
  );
  const creation = useCreateMedicalHistoryEntry(patientId, recordId);
  const update = useUpdateMedicalHistoryEntry(
    patientId,
    recordId,
    historyId ?? 0,
  );
  const loadedId = useRef<number | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<
    MedicalHistoryFormInput,
    unknown,
    MedicalHistoryForm
  >({
    resolver: zodResolver(medicalHistoryFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (
      !isEditing ||
      !detail.data ||
      loadedId.current === detail.data.id
    ) {
      return;
    }
    loadedId.current = detail.data.id;
    reset({
      tipo_antecedente_id: detail.data.tipo_antecedente_id,
      descripcion: detail.data.descripcion,
      fecha: detail.data.fecha ?? '',
      activo: detail.data.activo,
    });
  }, [detail.data, isEditing, reset]);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para modificar antecedentes médicos."
      />
    );
  }
  if (types.isLoading || (isEditing && detail.isLoading)) {
    return <LoadingState title="Preparando antecedente médico" />;
  }
  if (types.isError) {
    return (
      <ErrorState
        title="Tipos no disponibles"
        message="No se pudo cargar el catálogo de tipos de antecedente."
      />
    );
  }
  if (isEditing && (detail.isError || !detail.data)) {
    return (
      <ErrorState
        title="Antecedente no disponible"
        message="El antecedente no existe o no tenés acceso."
      />
    );
  }

  const mutation = isEditing ? update : creation;
  const busy = isSubmitting || mutation.isPending;
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        const payload: MedicalHistoryUpdate = {
          tipo_antecedente_id: values.tipo_antecedente_id,
          descripcion: values.descripcion,
          fecha: values.fecha || null,
          activo: values.activo,
        };
        await update.mutateAsync(payload);
      } else {
        const payload: MedicalHistoryCreate = {
          tipo_antecedente_id: values.tipo_antecedente_id,
          descripcion: values.descripcion,
          fecha: values.fecha || null,
          activo: values.activo,
        };
        await creation.mutateAsync(payload);
      }
      router.replace(
        `/(staff)/patients/${patientId}/record/history?recordId=${recordId}` as Href,
      );
    } catch {
      // React Query conserva 403/404/409/422 para mostrarlo en el formulario.
    }
  });

  const serverError = structuredHistoryErrorMessage(
    mutation.error,
    isEditing
      ? 'editar antecedentes médicos'
      : 'registrar antecedentes médicos',
  );

  return (
    <ClinicalFormShell
      eyebrow="HISTORIAL DEL PACIENTE"
      onBack={() => router.back()}
      subtitle={`Paciente #${patientId} · Expediente #${recordId}`}
      title={
        isEditing ? 'Editar Historial Médico' : 'Añadir Historial Médico'
      }
    >
      <Controller control={control} name="fecha" render={({ field }) => (
          <DateField error={errors.fecha?.message} label="Fecha" mode="date" onChange={field.onChange} value={field.value} />
        )} />
      {isEditing ? (
        <Controller
          control={control}
          name="activo"
          render={({ field }) => (
            <ChoiceField
              items={[
                { id: 1, nombre: 'Activo' },
                { id: 2, nombre: 'Inactivo' },
              ]}
              label="Visibilidad del registro"
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
      <Button
        disabled={busy}
        icon="save-outline"
        loading={busy}
        onPress={onSubmit}
      >
        {isEditing ? 'Guardar cambios' : 'Registrar antecedente'}
      </Button>
      <Button
        disabled={busy}
        onPress={() => router.back()}
        variant="secondary"
      >
        Cancelar
      </Button>
    </ClinicalFormShell>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: theme.color.dangerSoft,
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 4,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  errorText: {
    color: theme.color.dangerText,
    fontSize: 13,
    fontWeight: '700',
  },
});
