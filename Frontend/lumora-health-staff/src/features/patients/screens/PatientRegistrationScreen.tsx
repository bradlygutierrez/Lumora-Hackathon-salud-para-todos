import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { DateField } from '@/src/shared/components/DateField';
import { theme } from '@/src/shared/constants/theme';
import { ChoiceField } from '../components/ChoiceField';
import { usePatientCatalogs, useRegisterPatient } from '../hooks/use-patients';
import {
  patientRegistrationSchema,
  type PatientRegistrationForm,
  type PatientRegistrationInput,
} from '../schemas/patient-registration.schema';
import type { StaffPatientRegistrationPayload } from '../types/patient.types';

function registrationErrorMessage(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'conflict') return 'Ya existe un registro relacionado con estos datos.';
  if (apiError.code === 'validation_error') return 'Revisá los campos del formulario.';
  if (apiError.code === 'forbidden') return 'No tenés permiso para registrar pacientes.';
  return apiError.message;
}

function toPayload(values: PatientRegistrationForm): StaffPatientRegistrationPayload {
  return {
    persona: {
      nombres: values.nombres,
      apellidos: values.apellidos,
      email: values.email,
      fecha_nacimiento: values.fecha_nacimiento,
      telefono: values.telefono,
      sexo_id: values.sexo_id,
      direccion: {
        linea_1: values.direccion,
        ciudad: values.ciudad,
        departamento: values.departamento,
        pais: 'Nicaragua',
        es_principal: true,
      },
    },
    tipo_sangre_id: values.tipo_sangre_id,
    alergias: values.alergias,
    contacto_emergencia: {
      nombre: values.contacto_nombre,
      parentesco: values.contacto_parentesco,
      telefono: values.contacto_telefono,
    },
  };
}

export function PatientRegistrationScreen() {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const catalogs = usePatientCatalogs();
  const registration = useRegisterPatient();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<PatientRegistrationInput, unknown, PatientRegistrationForm>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      email: '',
      fecha_nacimiento: '',
      telefono: '',
      sexo_id: undefined,
      tipo_sangre_id: undefined,
      alergias: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      contacto_nombre: '',
      contacto_parentesco: '',
      contacto_telefono: '',
    },
  });

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para registrar pacientes." />;
  }

  if (catalogs.sexes.isLoading || catalogs.bloodTypes.isLoading) {
    return <LoadingState title="Cargando catálogos clínicos" />;
  }

  if (catalogs.sexes.isError || catalogs.bloodTypes.isError) {
    return <ErrorState title="No se pudieron cargar los catálogos" message="Intentá nuevamente." />;
  }

  const onSubmit = handleSubmit(async (values) => {
    const patient = await registration.mutateAsync(toPayload(values));
    router.replace(`/(staff)/patients/${patient.id}` as Href);
  });

  const serverMessage = registrationErrorMessage(registration.error);
  const busy = isSubmitting || registration.isPending;

  return (
    <Screen>
      <View style={styles.header}>
        <Button accessibilityLabel="Volver" icon="arrow-back" onPress={() => router.back()} variant="ghost">
          Volver
        </Button>
        <View style={styles.headerText}>
          <Text style={styles.title}>Registro de Nuevo Paciente</Text>
          <Text style={styles.subtitle}>Crea el registro clínico sin generar una cuenta Lumora.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormSection icon="person-circle-outline" title="Información personal">
          <Controller control={control} name="fecha_nacimiento" render={({ field }) => (
          <DateField
            error={errors.fecha_nacimiento?.message}
            label="Fecha de nacimiento"
            onChange={field.onChange}
            value={field.value}
          />
        )} />
          <Controller
            control={control}
            name="sexo_id"
            render={({ field }) => (
              <ChoiceField
                error={errors.sexo_id?.message}
                items={catalogs.sexes.data?.items ?? []}
                label="Sexo *"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="tipo_sangre_id"
            render={({ field }) => (
              <ChoiceField
                clearLabel="No indicado"
                items={catalogs.bloodTypes.data?.items ?? []}
                label="Tipo de sangre"
                onChange={field.onChange}
                optional
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="alergias"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Alergias"
                error={errors.alergias?.message}
                label="Alergias conocidas"
                multiline
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Opcional"
                value={field.value ?? ''}
              />
            )}
          />
          <Controller
            control={control}
            name="direccion"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Dirección"
                error={errors.direccion?.message}
                label="Dirección *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Dirección residencial"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="ciudad"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Ciudad"
                error={errors.ciudad?.message}
                label="Ciudad *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Managua"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="departamento"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Departamento"
                error={errors.departamento?.message}
                label="Departamento"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Opcional"
                value={field.value ?? ''}
              />
            )}
          />
        </FormSection>

        <FormSection icon="call-outline" title="Contacto de emergencia">
          <Controller
            control={control}
            name="contacto_nombre"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Contacto de emergencia"
                error={errors.contacto_nombre?.message}
                label="Nombre *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Nombre completo"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="contacto_parentesco"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Parentesco"
                error={errors.contacto_parentesco?.message}
                label="Parentesco *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Madre, cónyuge, tutor..."
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="contacto_telefono"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Teléfono del contacto"
                error={errors.contacto_telefono?.message}
                keyboardType="phone-pad"
                label="Teléfono *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="7777-7777"
                value={field.value}
              />
            )}
          />
        </FormSection>

        {serverMessage ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Ionicons color={theme.color.danger} name="warning-outline" size={20} />
            <Text style={styles.errorText}>{serverMessage}</Text>
          </View>
        ) : null}

        <Button
          accessibilityLabel="Guardar paciente"
          disabled={busy}
          icon="save-outline"
          loading={busy}
          onPress={onSubmit}
        >
          Guardar Paciente
        </Button>
        <Button disabled={busy} onPress={() => router.back()} variant="secondary">
          Cancelar
        </Button>
      </ScrollView>
    </Screen>
  );
}

type FormSectionProps = {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

function FormSection({ children, icon, title }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons color={theme.color.primary} name={icon} size={20} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', gap: theme.spacing.sm },
  headerText: { gap: theme.spacing.xs },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14 },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl, paddingTop: theme.spacing.lg },
  section: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderBottomColor: theme.color.softBorder,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  sectionTitle: { color: theme.color.text, fontSize: 16, fontWeight: '800' },
  sectionBody: { gap: theme.spacing.lg, padding: theme.spacing.lg },
  errorBox: {
    alignItems: 'center',
    backgroundColor: theme.color.dangerSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  errorText: { color: theme.color.dangerText, flex: 1, fontSize: theme.typography.caption, fontWeight: '700' },
});
