import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { formatLocalHHMM } from '@/features/reminders/utils/format-time';
import { todayAtHora } from '@/features/prescriptions/utils/time-of-day';
import { NewReminderForm } from '@/features/reminders/components/NewReminderForm';
import { useReminder } from '@/features/reminders/hooks/useReminder';
import {
  useCreateSeguimientoReminder,
  useUpdateSeguimientoReminder,
} from '@/features/reminders/hooks/useReminderMutations';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

type FormValues = {
  titulo: string;
  mensaje: string;
  /** "Rutina simple": la única hora del recordatorio. */
  hora: string;
  /** "Con meta y progreso": todas las horas del día elegidas. Vacío en Rutina simple. */
  horas: string[];
  objetivoCantidad: number | null;
  unidad: string | null;
};

/** Convierte una lista de "HH:MM" a la próxima `fecha_programada` (ISO) --
 * usa la más temprana del día como fecha "principal" del recordatorio. */
function fechaProgramadaDesde(hora: string, horas: string[]): string {
  if (horas.length > 0) {
    const masTemprana = [...horas].sort()[0];
    return todayAtHora(masTemprana).toISOString();
  }
  return todayAtHora(hora).toISOString();
}

/**
 * "+ Añadir Nuevo Recordatorio" -- crea un recordatorio de Seguimiento (A10).
 *
 * También sirve como pantalla de edición: cuando llega con
 * `?id=<recordatorioId>` (botón "Editar" del tablero de Recordatorios),
 * precarga los datos de ese recordatorio y, al guardar, actualiza en vez
 * de crear uno nuevo.
 */
export default function NewReminderRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recordatorioId = id ? Number(id) : undefined;
  const isEditMode = recordatorioId !== undefined;

  const reminderQuery = useReminder(recordatorioId);
  const createReminder = useCreateSeguimientoReminder();
  const updateReminder = useUpdateSeguimientoReminder();
  const { showFeedback } = useFeedback();

  const mutation = isEditMode ? updateReminder : createReminder;

  function handleCancel() {
    router.back();
  }

  function handleSubmit(values: FormValues) {
    if (isEditMode && recordatorioId !== undefined) {
      updateReminder.mutate(
        {
          id: recordatorioId,
          titulo: values.titulo,
          mensaje: values.mensaje,
          fechaProgramada: fechaProgramadaDesde(values.hora, values.horas),
          objetivoCantidad: values.objetivoCantidad,
          unidad: values.unidad,
          horas: values.horas,
        },
        {
          onSuccess: () => {
            showFeedback('Recordatorio actualizado.', 'success');
            router.back();
          },
          onError: () =>
            showFeedback('No pudimos actualizar el recordatorio. Intenta de nuevo.', 'error'),
        },
      );
      return;
    }

    createReminder.mutate(
      {
        titulo: values.titulo,
        mensaje: values.mensaje,
        fechaProgramada: fechaProgramadaDesde(values.hora, values.horas),
        objetivoCantidad: values.objetivoCantidad,
        unidad: values.unidad,
        horas: values.horas,
      },
      {
        onSuccess: () => {
          showFeedback('Recordatorio guardado.', 'success');
          router.back();
        },
        onError: () =>
          showFeedback('No pudimos guardar el recordatorio. Intenta de nuevo.', 'error'),
      },
    );
  }

  // Modo edición: hasta que no llegue el recordatorio no sabemos qué
  // precargar en el formulario (react-hook-form solo lee defaultValues
  // una vez, al montar).
  if (isEditMode && reminderQuery.isLoading) {
    return (
      <FullScreenState
        title="Cargando recordatorio"
        message="Un momento por favor."
      />
    );
  }

  if (isEditMode && (reminderQuery.isError || !reminderQuery.data)) {
    return (
      <FullScreenState
        title="No pudimos cargar el recordatorio"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={() => void reminderQuery.refetch()}
      />
    );
  }

  const recordatorio = reminderQuery.data;
  const defaultValues = recordatorio
    ? {
        // El recordatorio ya existente decide con qué tipo se precarga el
        // selector -- si ya tenía objetivo, sigue siendo "Con meta y
        // progreso"; si no, "Rutina simple".
        tipo: (recordatorio.objetivo_cantidad != null ? 'progreso' : 'rutina') as
          | 'rutina'
          | 'progreso',
        titulo: recordatorio.titulo,
        mensaje: recordatorio.mensaje,
        hora: formatLocalHHMM(new Date(recordatorio.fecha_programada)),
        horas: recordatorio.horarios.map((h) => h.hora.slice(0, 5)).sort(),
        objetivoCantidad:
          recordatorio.objetivo_cantidad != null ? String(recordatorio.objetivo_cantidad) : '',
        unidad: recordatorio.unidad ?? '',
      }
    : undefined;

  return (
    <Screen scrollable keyboardAvoiding contentClassName="px-0 py-0">
      <AppHeader title={isEditMode ? 'Editar Recordatorio' : 'Nuevo Recordatorio'} />

      <View className="gap-6 px-4 py-4">
        {mutation.isError ? (
          <View className="rounded-2xl border border-warm-500 bg-warm-300 p-4">
            <Text className="text-sm font-medium text-coal-900">
              {isEditMode
                ? 'No pudimos actualizar el recordatorio. Revisa tu conexión e intenta de nuevo.'
                : 'No pudimos guardar el recordatorio. Revisa tu conexión e intenta de nuevo.'}
            </Text>
          </View>
        ) : null}

        <NewReminderForm
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={defaultValues}
          submitLabel={isEditMode ? 'Guardar cambios' : 'Guardar'}
        />
      </View>
    </Screen>
  );
}
