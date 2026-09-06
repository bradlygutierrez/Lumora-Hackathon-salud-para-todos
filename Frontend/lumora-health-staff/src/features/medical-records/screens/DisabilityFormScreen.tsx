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
  useConditionStatuses,
  useCreateDisability,
  useDisability,
  useUpdateDisability,
} from '../hooks/use-structured-history';
import {
  disabilityFormSchema,
  type DisabilityForm,
  type DisabilityFormInput,
} from '../schemas/structured-history.schemas';
import type {
  DisabilityCreate,
  DisabilityUpdate,
} from '../types/structured-history.types';

const emptyValues: DisabilityFormInput = {
  nombre: '',
  estado_condicion_id: undefined,
  observaciones: '',
  activo: true,
};

function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function DisabilityFormScreen({
  patientId,
  recordId,
  disabilityId,
}: {
  patientId: number;
  recordId: number;
  disabilityId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const isEditing = typeof disabilityId === 'number';
  const statuses = useConditionStatuses(allowed);
  const detail = useDisability(
    patientId,
    disabilityId ?? 0,
    allowed && isEditing,
  );
  const creation = useCreateDisability(patientId, recordId);
  const update = useUpdateDisability(
    patientId,
    recordId,
    disabilityId ?? 0,
  );
  const loadedId = useRef<number | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<DisabilityFormInput, unknown, DisabilityForm>({
    resolver: zodResolver(disabilityFormSchema),
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
      estado_condicion_id:
        detail.data.estado_condicion_id ?? undefined,
      observaciones: detail.data.observaciones ?? '',
      activo: detail.data.activo,
    });
  }, [detail.data, isEditing, reset]);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para modificar discapacidades clínicas."
      />
    );
  }
  if (statuses.isLoading || (isEditing && detail.isLoading)) {
    return <LoadingState title="Preparando discapacidad" />;
  }
  if (statuses.isError) {
    return (
      <ErrorState
        title="Estados no disponibles"
        message="No se pudo cargar el catálogo de estados."
      />
    );
  }
  if (isEditing && (detail.isError || !detail.data)) {
    return (
      <ErrorState
        title="Discapacidad no disponible"
        message="El registro no existe o no tenés acceso."
      />
    );
  }

  const mutation = isEditing ? update : creation;
  const busy = isSubmitting || mutation.isPending;
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        const payload: DisabilityUpdate = {
          nombre: values.nombre,
          estado_condicion_id:
            values.estado_condicion_id ?? null,
          observaciones: nullable(values.observaciones),
          activo: values.activo,
        };
        await update.mutateAsync(payload);
      } else {
        const payload: DisabilityCreate = {
          nombre: values.nombre,
          estado_condicion_id:
            values.estado_condicion_id ?? null,
          observaciones: nullable(values.observaciones),
          activo: values.activo,
        };
        await creation.mutateAsync(payload);
      }
      router.replace(
        `/(staff)/patients/${patientId}/record/disabilities?recordId=${recordId}` as Href,
      );
    } catch {
      // React Query conserva el error para mostrarlo debajo del formulario.
    }
  });

  const serverError = structuredHistoryErrorMessage(
    mutation.error,
    isEditing ? 'editar discapacidades' : 'registrar discapacidades',
  );

  return (
    <ClinicalFormShell
      eyebrow="PERFIL DEL PACIENTE"
      onBack={() => router.back()}
      subtitle={`Paciente #${patientId} · Expediente #${recordId}`}
      title={
        isEditing ? 'Editar Discapacidad' : 'Añadir Discapacidad'
      }
    >
      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Nombre de discapacidad"
            error={errors.nombre?.message}
            label="Discapacidad *"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Descripción breve del registro"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="estado_condicion_id"
        render={({ field }) => (
          <ChoiceField
            clearLabel="Sin estado"
            items={statuses.data?.items ?? []}
            label="Estado clínico"
            onChange={field.onChange}
            optional
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="observaciones"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Observaciones de discapacidad"
            error={errors.observaciones?.message}
            label="Observaciones"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Información clínica adicional"
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
        {isEditing ? 'Guardar cambios' : 'Registrar discapacidad'}
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
