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
import { theme } from '@/src/shared/constants/theme';
import { ClinicalFormShell } from '../components/ClinicalFormShell';
import { structuredHistoryErrorMessage } from '../components/structured-history.ui';
import {
  useCondition,
  useConditionStatuses,
  useCreateCondition,
  useUpdateCondition,
} from '../hooks/use-structured-history';
import {
  conditionFormSchema,
  type ConditionForm,
  type ConditionFormInput,
} from '../schemas/structured-history.schemas';
import type {
  ConditionCreate,
  ConditionUpdate,
} from '../types/structured-history.types';

const emptyValues: ConditionFormInput = {
  nombre: '',
  estado_condicion_id: 0,
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  motivo_historial: '',
  activo: true,
};

function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function ConditionFormScreen({
  patientId,
  recordId,
  conditionId,
  diagnosisId,
}: {
  patientId: number;
  recordId: number;
  conditionId?: number;
  diagnosisId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const isEditing = typeof conditionId === 'number';
  const statuses = useConditionStatuses(allowed);
  const detail = useCondition(
    recordId,
    conditionId ?? 0,
    allowed && isEditing,
  );
  const creation = useCreateCondition(recordId, patientId);
  const update = useUpdateCondition(
    recordId,
    patientId,
    conditionId ?? 0,
  );
  const loadedId = useRef<number | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<ConditionFormInput, unknown, ConditionForm>({
    resolver: zodResolver(conditionFormSchema),
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
      nombre: detail.data.nombre,
      estado_condicion_id: detail.data.estado_condicion_id,
      descripcion: detail.data.descripcion ?? '',
      fecha_inicio: detail.data.fecha_inicio ?? '',
      fecha_fin: detail.data.fecha_fin ?? '',
      motivo_historial: '',
      activo: detail.data.activo,
    });
  }, [detail.data, isEditing, reset]);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para modificar condiciones clínicas."
      />
    );
  }
  if (statuses.isLoading || (isEditing && detail.isLoading)) {
    return <LoadingState title="Preparando condición clínica" />;
  }
  if (statuses.isError) {
    return (
      <ErrorState
        title="Estados no disponibles"
        message="No se pudo cargar el catálogo de estados de condición."
      />
    );
  }
  if (isEditing && (detail.isError || !detail.data)) {
    return (
      <ErrorState
        title="Condición no disponible"
        message="No se pudo obtener el detalle de la condición desde el listado del expediente."
      />
    );
  }

  const mutation = isEditing ? update : creation;
  const busy = isSubmitting || mutation.isPending;
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing && detail.data) {
        const payload: ConditionUpdate = {
          estado_condicion_id: values.estado_condicion_id,
          nombre: values.nombre,
          descripcion: values.descripcion.trim(),
          ...(values.fecha_inicio
            ? { fecha_inicio: values.fecha_inicio }
            : {}),
          ...(values.fecha_fin ? { fecha_fin: values.fecha_fin } : {}),
          activo: values.activo,
          motivo_historial: nullable(values.motivo_historial),
        };
        await update.mutateAsync(payload);
      } else {
        const payload: ConditionCreate = {
          estado_condicion_id: values.estado_condicion_id,
          nombre: values.nombre,
          descripcion: nullable(values.descripcion),
          ...(values.fecha_inicio
            ? { fecha_inicio: values.fecha_inicio }
            : {}),
          ...(diagnosisId ? { diagnostico_id: diagnosisId } : {}),
          motivo_historial: nullable(values.motivo_historial),
          activo: values.activo,
        };
        await creation.mutateAsync(payload);
      }
      router.replace(
        `/(staff)/patients/${patientId}/record/conditions?recordId=${recordId}` as Href,
      );
    } catch {
      // React Query conserva el error para mostrar el mensaje del backend.
    }
  });

  const serverError = structuredHistoryErrorMessage(
    mutation.error,
    isEditing
      ? 'editar condiciones clínicas'
      : 'registrar condiciones clínicas',
  );

  return (
    <ClinicalFormShell
      eyebrow="CONDICIONES ACTIVAS Y CRÓNICAS"
      onBack={() => router.back()}
      subtitle={`Paciente #${patientId} · Expediente #${recordId}`}
      title={
        isEditing ? 'Editar Enfermedad' : 'Añadir/Editar Enfermedad'
      }
    >
      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Nombre de condición"
            error={errors.nombre?.message}
            label="Condición *"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Ej. Hipertensión arterial"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="estado_condicion_id"
        render={({ field }) => (
          <ChoiceField
            error={errors.estado_condicion_id?.message}
            items={statuses.data?.items ?? []}
            label="Estado clínico *"
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
            accessibilityLabel="Descripción de condición"
            error={errors.descripcion?.message}
            label="Descripción"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Información clínica adicional"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="fecha_inicio"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Fecha de inicio de condición"
            error={errors.fecha_inicio?.message}
            label="Fecha de inicio"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="AAAA-MM-DD"
            value={field.value}
          />
        )}
      />
      {isEditing ? (
        <Controller
          control={control}
          name="fecha_fin"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Fecha de fin de condición"
              error={errors.fecha_fin?.message}
              label="Fecha de fin"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="AAAA-MM-DD"
              value={field.value}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="motivo_historial"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Motivo de cambio de condición"
            error={errors.motivo_historial?.message}
            label="Motivo para trazabilidad"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Opcional; queda registrado en el historial de la condición"
            value={field.value}
          />
        )}
      />
      {isEditing ? (
        <Controller
          control={control}
          name="activo"
          render={({ field }) => (
            <ChoiceField
              items={[
                { id: 1, nombre: 'Activa' },
                { id: 2, nombre: 'Inactiva' },
              ]}
              label="Visibilidad del registro"
              onChange={(value) => field.onChange(value !== 2)}
              value={field.value ? 1 : 2}
            />
          )}
        />
      ) : null}

      {!isEditing && diagnosisId ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            La nueva condición quedará vinculada al diagnóstico #
            {diagnosisId}. Se validará que el diagnóstico pertenezca
            a este expediente.
          </Text>
        </View>
      ) : null}
      {isEditing && detail.data?.diagnostico_id ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Esta condición está vinculada al diagnóstico #
            {detail.data.diagnostico_id}. Editar la condición no modifica esa relación;
            los diagnósticos se gestionan en su módulo clínico.
          </Text>
        </View>
      ) : null}
      {isEditing ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Al actualizar una condición, los valores vacíos se descartan.
            Si una fecha existente se deja vacía, se omite y se
            conserva el valor actual.
          </Text>
        </View>
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
        {isEditing ? 'Guardar cambios' : 'Registrar condición'}
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
  notice: {
    backgroundColor: theme.color.primarySoft,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noticeText: {
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
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
