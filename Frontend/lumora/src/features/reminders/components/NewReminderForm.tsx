import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import {
  newReminderFormSchema,
  type NewReminderFormValues,
} from '@/features/reminders/utils/new-reminder-form-schema';
import { AppButton } from '@/shared/components/AppButton';
import { AppTextInput } from '@/shared/components/AppTextInput';
import { FormTextField } from '@/shared/components/FormTextField';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

type NewReminderFormSubmitValues = {
  titulo: string;
  mensaje: string;
  /** "Rutina simple": la única hora del recordatorio. */
  hora: string;
  /** "Con meta y progreso": todas las horas del día elegidas. Vacío en Rutina simple. */
  horas: string[];
  objetivoCantidad: number | null;
  unidad: string | null;
};

type NewReminderFormProps = {
  isSubmitting: boolean;
  onSubmit: (values: NewReminderFormSubmitValues) => void;
  onCancel: () => void;
  /** Precarga el formulario -- modo edición (botón "Editar" del tablero). */
  defaultValues?: Partial<NewReminderFormValues>;
  /** Texto del botón de guardar, ej. "Guardar cambios" en modo edición. */
  submitLabel?: string;
};

/**
 * Formulario de "+ Añadir Nuevo Recordatorio" -- crea o edita recordatorios
 * de "Seguimiento" (A10). `defaultValues` viene precargado cuando se entra
 * en modo edición desde el botón "Editar" de un recordatorio existente.
 *
 * El selector "Rutina simple" / "Con meta y progreso" es explícito -- antes
 * el tipo se adivinaba según si se llenaban o no Objetivo/Unidad, lo cual
 * confundía a la usuaria. "Con meta y progreso" además deja elegir VARIAS
 * horas del día (ej. Beber Agua a las 08:00/12:00/16:00/20:00) en vez de
 * una sola -- cada hora sale como su propia tarjeta en el tablero, todas
 * compartiendo el mismo objetivo/progreso.
 */
export function NewReminderForm({
  isSubmitting,
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel,
}: NewReminderFormProps) {
  const { control, handleSubmit, watch, setValue } = useForm<NewReminderFormValues>({
    resolver: zodResolver(newReminderFormSchema),
    defaultValues: {
      tipo: 'rutina',
      titulo: '',
      mensaje: '',
      hora: '',
      horas: [],
      objetivoCantidad: '',
      unidad: '',
      ...defaultValues,
    },
  });

  const tipo = watch('tipo');
  const horas = watch('horas') ?? [];

  const [nuevaHora, setNuevaHora] = useState('');
  const [nuevaHoraError, setNuevaHoraError] = useState<string | undefined>();

  function selectTipo(nextTipo: 'rutina' | 'progreso') {
    if (tipo === nextTipo) return;
    setValue('tipo', nextTipo, { shouldValidate: true });
    if (nextTipo === 'rutina') {
      // Limpia lo que se haya escrito antes -- si vuelve a elegir "Con
      // meta y progreso" más tarde, empieza en blanco en vez de mostrar
      // valores viejos que ya no aplicaban.
      setValue('objetivoCantidad', '');
      setValue('unidad', '');
      setValue('horas', []);
    }
  }

  function handleAgregarHora() {
    const trimmed = nuevaHora.trim();

    if (!HORA_REGEX.test(trimmed)) {
      setNuevaHoraError('Usa el formato HH:MM (24 horas).');
      return;
    }
    if (horas.includes(trimmed)) {
      setNuevaHoraError('Esa hora ya la agregaste.');
      return;
    }

    setValue('horas', [...horas, trimmed].sort(), { shouldValidate: true });
    setNuevaHora('');
    setNuevaHoraError(undefined);
  }

  function handleQuitarHora(hora: string) {
    setValue(
      'horas',
      horas.filter((h) => h !== hora),
      { shouldValidate: true },
    );
  }

  function submit(values: NewReminderFormValues) {
    const esProgreso = values.tipo === 'progreso';
    onSubmit({
      titulo: values.titulo.trim(),
      mensaje: values.mensaje.trim(),
      hora: esProgreso ? '' : values.hora?.trim() ?? '',
      horas: esProgreso ? (values.horas ?? []) : [],
      objetivoCantidad: esProgreso ? Number(values.objetivoCantidad) : null,
      unidad: esProgreso ? (values.unidad?.trim() ?? null) : null,
    });
  }

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-sm font-medium text-coal-900">Tipo de recordatorio</Text>

        <View className="flex-row overflow-hidden rounded-xl border border-lumen-500">
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Rutina simple"
            accessibilityState={{ selected: tipo === 'rutina' }}
            onPress={() => selectTipo('rutina')}
            className={`flex-1 items-center justify-center py-3 ${
              tipo === 'rutina' ? 'bg-lumen-500' : 'bg-bone-300'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tipo === 'rutina' ? 'text-coal-900' : 'text-coal-500'
              }`}
            >
              Rutina simple
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Con meta y progreso"
            accessibilityState={{ selected: tipo === 'progreso' }}
            onPress={() => selectTipo('progreso')}
            className={`flex-1 items-center justify-center py-3 ${
              tipo === 'progreso' ? 'bg-lumen-500' : 'bg-bone-300'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tipo === 'progreso' ? 'text-coal-900' : 'text-coal-500'
              }`}
            >
              Con meta y progreso
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs text-coal-500">
          {tipo === 'progreso'
            ? 'Se mostrará con una barra de progreso tu objetivo.'
            : 'Se mostrará con un botón para marcar como hecho.'}
        </Text>
      </View>

      <FormTextField
        control={control}
        name="titulo"
        label="Título"
        placeholder="Ej. Beber Agua"
      />

      <FormTextField
        control={control}
        name="mensaje"
        label="Instrucciones"
        placeholder="Ej. Objetivo: 2 Litros diarios."
        multiline
      />

      {tipo === 'rutina' ? (
        <FormTextField
          control={control}
          name="hora"
          label="Hora"
          placeholder="Ej. 12:00 (24 horas)"
          keyboardType="numbers-and-punctuation"
        />
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-medium text-coal-900">
            Horas del día en que quieres que te recuerde
          </Text>

          {horas.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {horas.map((hora) => (
                <View
                  key={hora}
                  className="flex-row items-center gap-2 rounded-full bg-lumen-300 py-1.5 pl-3 pr-2"
                >
                  <Text className="text-sm font-medium text-coal-900">{hora}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar hora ${hora}`}
                    onPress={() => handleQuitarHora(hora)}
                    className="h-5 w-5 items-center justify-center rounded-full bg-bone-100"
                  >
                    <Text className="text-xs font-bold text-coal-500">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-coal-500">Todavía no agregas ninguna hora.</Text>
          )}

          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <AppTextInput
                placeholder="Ej. 08:00 (24 horas)"
                keyboardType="numbers-and-punctuation"
                value={nuevaHora}
                onChangeText={(value) => {
                  setNuevaHora(value);
                  setNuevaHoraError(undefined);
                }}
                error={nuevaHoraError}
              />
            </View>
            <AppButton title="+ Agregar hora" variant="ghost" onPress={handleAgregarHora} />
          </View>
        </View>
      )}

      {tipo === 'progreso' ? (
        <>
          <FormTextField
            control={control}
            name="objetivoCantidad"
            label="Objetivo"
            placeholder="Ej. 2"
            keyboardType="decimal-pad"
          />

          <FormTextField
            control={control}
            name="unidad"
            label="Unidad"
            placeholder="Ej. Litros"
          />
        </>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <AppButton title="Cancelar" variant="ghost" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <AppButton
            title={isSubmitting ? 'Guardando…' : (submitLabel ?? 'Guardar')}
            onPress={handleSubmit(submit)}
            loading={isSubmitting}
          />
        </View>
      </View>
    </View>
  );
}
