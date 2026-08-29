import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { structuredHistoryErrorMessage } from '../components/structured-history.ui';
import {
  useAllergy,
  useConditionStatuses,
  useCreateAllergy,
  useSeverityLevels,
  useUpdateAllergy,
} from '../hooks/use-structured-history';
import {
  allergyFormSchema,
  type AllergyForm,
  type AllergyFormInput,
} from '../schemas/structured-history.schemas';
import type { AllergyCreate, AllergyUpdate } from '../types/structured-history.types';

const emptyValues: AllergyFormInput = {
  nombre: '',
  nivel_severidad_id: undefined,
  estado_condicion_id: undefined,
  observaciones: '',
  activo: true,
};

function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function AllergyFormScreen({
  patientId,
  recordId,
  allergyId,
}: {
  patientId: number;
  recordId: number;
  allergyId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const isEditing = typeof allergyId === 'number';
  const statuses = useConditionStatuses(allowed);
  const severities = useSeverityLevels(allowed);
  const detail = useAllergy(patientId, allergyId ?? 0, allowed && isEditing);
  const creation = useCreateAllergy(patientId, recordId);
  const update = useUpdateAllergy(patientId, recordId, allergyId ?? 0);
  const loadedId = useRef<number | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<AllergyFormInput, unknown, AllergyForm>({
    resolver: zodResolver(allergyFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!isEditing || !detail.data || loadedId.current === detail.data.id) return;
    loadedId.current = detail.data.id;
    reset({
      nombre: detail.data.nombre,
      nivel_severidad_id: detail.data.nivel_severidad_id ?? undefined,
      estado_condicion_id: detail.data.estado_condicion_id ?? undefined,
      observaciones: detail.data.observaciones ?? '',
      activo: detail.data.activo,
    });
  }, [detail.data, isEditing, reset]);

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para modificar alergias clínicas."
      />
    );
  }
  if (statuses.isLoading || severities.isLoading || (isEditing && detail.isLoading)) {
    return <LoadingState title="Preparando alergia" />;
  }
  if (statuses.isError || severities.isError) {
    return (
      <ErrorState
        title="Catálogos no disponibles"
        message="No se pudieron cargar severidades y estados desde FastAPI."
      />
    );
  }
  if (isEditing && (detail.isError || !detail.data)) {
    return (
      <ErrorState
        title="Alergia no disponible"
        message="La alergia no existe o no tenés acceso."
      />
    );
  }

  const mutation = isEditing ? update : creation;
  const busy = isSubmitting || mutation.isPending;
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        const payload: AllergyUpdate = {
          nombre: values.nombre,
          nivel_severidad_id: values.nivel_severidad_id ?? null,
          estado_condicion_id: values.estado_condicion_id ?? null,
          observaciones: nullable(values.observaciones),
          activo: values.activo,
        };
        await update.mutateAsync(payload);
      } else {
        const payload: AllergyCreate = {
          nombre: values.nombre,
          nivel_severidad_id: values.nivel_severidad_id ?? null,
          estado_condicion_id: values.estado_condicion_id ?? null,
          observaciones: nullable(values.observaciones),
          activo: values.activo,
        };
        await creation.mutateAsync(payload);
      }
      router.replace(
        `/(staff)/patients/${patientId}/record/allergies?recordId=${recordId}` as Href,
      );
    } catch {
      // React Query conserva el error para mostrar el detalle del backend.
    }
  });

  const serverError = structuredHistoryErrorMessage(
    mutation.error,
    isEditing ? 'editar alergias' : 'registrar alergias',
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver
        </Button>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{isEditing ? 'Editar Alergia' : 'Añadir Alergia'}</Text>
          <Text style={styles.subtitle}>Paciente #{patientId}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Nombre de alergia"
              error={errors.nombre?.message}
              label="Alergia *"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Ej. Penicilina"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="nivel_severidad_id"
          render={({ field }) => (
            <ChoiceField
              clearLabel="Sin severidad"
              items={severities.data?.items ?? []}
              label="Severidad"
              onChange={field.onChange}
              optional
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
              accessibilityLabel="Observaciones de alergia"
              error={errors.observaciones?.message}
              label="Observaciones"
              multiline
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Reacción documentada u otra información"
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
        <Button disabled={busy} icon="save-outline" loading={busy} onPress={onSubmit}>
          {isEditing ? 'Guardar cambios' : 'Registrar alergia'}
        </Button>
        <Button disabled={busy} onPress={() => router.back()} variant="secondary">
          Cancelar
        </Button>
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
