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
import { theme } from '@/src/shared/constants/theme';
import { ChoiceField } from '../components/ChoiceField';
import { usePatientCatalogs, useRegisterEmergencyPatient } from '../hooks/use-patients';
import {
  emergencyPatientRegistrationSchema,
  type EmergencyPatientRegistrationForm,
  type EmergencyPatientRegistrationInput,
} from '../schemas/emergency-patient-registration.schema';
import type { EmergencyPatientRegistrationPayload } from '../types/patient.types';

function registrationErrorMessage(error: unknown) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'validation_error') return 'Revisá los campos del formulario.';
  if (apiError.code === 'forbidden') {
    return 'No tenés permiso para registrar pacientes, o tu usuario no tiene un perfil profesional vinculado.';
  }
  return apiError.message;
}

function toPayload(values: EmergencyPatientRegistrationForm): EmergencyPatientRegistrationPayload {
  return {
    persona: {
      nombres: values.nombres,
      apellidos: values.apellidos,
      fecha_nacimiento: values.fecha_nacimiento,
      telefono: values.telefono,
      sexo_id: values.sexo_id,
    },
    contacto_emergencia:
      values.contacto_nombre && values.contacto_parentesco && values.contacto_telefono
        ? {
            nombre: values.contacto_nombre,
            parentesco: values.contacto_parentesco,
            telefono: values.contacto_telefono,
          }
        : undefined,
    motivo_consulta: values.motivo_consulta,
  };
}

export function EmergencyPatientRegistrationScreen() {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const catalogs = usePatientCatalogs();
  const registration = useRegisterEmergencyPatient();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<EmergencyPatientRegistrationInput, unknown, EmergencyPatientRegistrationForm>({
    resolver: zodResolver(emergencyPatientRegistrationSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      telefono: '',
      sexo_id: undefined,
      motivo_consulta: '',
      contacto_nombre: '',
      contacto_parentesco: '',
      contacto_telefono: '',
    },
  });

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para registrar pacientes." />;
  }

  if (catalogs.sexes.isLoading) {
    return <LoadingState title="Cargando catálogos clínicos" />;
  }

  if (catalogs.sexes.isError) {
    return <ErrorState title="No se pudieron cargar los catálogos" message="Intentá nuevamente." />;
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await registration.mutateAsync(toPayload(values));
    router.replace(
      `/(staff)/patients/${result.paciente.id}/record/consultations/${result.consulta_id}` as Href,
    );
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
          <Text style={styles.title}>Registro de emergencia</Text>
          <Text style={styles.subtitle}>
            Solo lo esencial para empezar a atender ahora. Podés completar el resto del expediente
            más tarde.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.noticeBox}>
          <Ionicons color={theme.color.warning} name="alert-circle-outline" size={20} />
          <Text style={styles.noticeText}>
            Este alta es intencionalmente mínima. No pide dirección ni datos que puedan no
            conocerse todavía; se pueden agregar después desde la ficha del paciente.
          </Text>
        </View>

        <FormSection icon="person-circle-outline" title="Paciente">
          <Controller
            control={control}
            name="nombres"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Nombres"
                error={errors.nombres?.message}
                label="Nombres *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Nombre (o provisional, si se desconoce)"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="apellidos"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Apellidos"
                error={errors.apellidos?.message}
                label="Apellidos *"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Apellidos (o provisional, si se desconoce)"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="fecha_nacimiento"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Fecha de nacimiento"
                error={errors.fecha_nacimiento?.message}
                label="Fecha de nacimiento"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="AAAA-MM-DD (opcional)"
                value={field.value ?? ''}
              />
            )}
          />
          <Controller
            control={control}
            name="telefono"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Teléfono"
                error={errors.telefono?.message}
                keyboardType="phone-pad"
                label="Teléfono"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Opcional"
                value={field.value ?? ''}
              />
            )}
          />
          <Controller
            control={control}
            name="sexo_id"
            render={({ field }) => (
              <ChoiceField
                clearLabel="No indicado"
                error={errors.sexo_id?.message}
                items={catalogs.sexes.data?.items ?? []}
                label="Sexo"
                onChange={field.onChange}
                optional
                value={field.value}
              />
            )}
          />
        </FormSection>

        <FormSection icon="pulse-outline" title="Atención">
          <Controller
            control={control}
            name="motivo_consulta"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Motivo de la atención"
                error={errors.motivo_consulta?.message}
                label="Motivo *"
                multiline
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Ej.: llega por trauma en pierna derecha, consciente"
                value={field.value}
              />
            )}
          />
        </FormSection>

        <FormSection icon="call-outline" title="Acompañante (opcional)">
          <Controller
            control={control}
            name="contacto_nombre"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Nombre del acompañante"
                error={errors.contacto_nombre?.message}
                label="Nombre"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Nombre completo"
                value={field.value ?? ''}
              />
            )}
          />
          <Controller
            control={control}
            name="contacto_parentesco"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Parentesco del acompañante"
                error={errors.contacto_parentesco?.message}
                label="Parentesco"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Madre, vecino, tutor..."
                value={field.value ?? ''}
              />
            )}
          />
          <Controller
            control={control}
            name="contacto_telefono"
            render={({ field }) => (
              <TextField
                accessibilityLabel="Teléfono del acompañante"
                error={errors.contacto_telefono?.message}
                keyboardType="phone-pad"
                label="Teléfono"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Opcional"
                value={field.value ?? ''}
              />
            )}
          />
          <Text style={styles.helperText}>
            No hace falta que tenga cuenta en Lumora: queda anotado como contacto de emergencia
            del paciente.
          </Text>
        </FormSection>

        {serverMessage ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Ionicons color={theme.color.danger} name="warning-outline" size={20} />
            <Text style={styles.errorText}>{serverMessage}</Text>
          </View>
        ) : null}

        <Button
          accessibilityLabel="Registrar y comenzar atención"
          disabled={busy}
          icon="save-outline"
          loading={busy}
          onPress={onSubmit}
        >
          Registrar y comenzar atención
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
  noticeBox: {
    alignItems: 'center',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  noticeText: { color: theme.color.text, flex: 1, fontSize: theme.typography.caption },
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
  helperText: { color: theme.color.subtleText, fontSize: theme.typography.caption },
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
