import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { canManagePatientData } from '@/features/caregiver-access/utils/caregiver-permissions';
import { usePostponeDose } from '@/features/prescriptions/hooks/usePostponeDose';
import { useRegisterDose } from '@/features/prescriptions/hooks/useRegisterDose';
import { useSkipDose } from '@/features/prescriptions/hooks/useSkipDose';
import { ConfirmDialog } from '@/features/reminders/components/ConfirmDialog';
import { PostponeDoseModal } from '@/features/reminders/components/PostponeDoseModal';
import { GoalCompleteModal } from '@/features/reminders/components/GoalCompleteModal';
import { ProgressUpdateModal } from '@/features/reminders/components/ProgressUpdateModal';
import { ReminderSection } from '@/features/reminders/components/ReminderSection';
import { useReminderBoard } from '@/features/reminders/hooks/useReminderBoard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import {
  useDeleteReminder,
  useMarkReminderDone,
  useUpdateReminderProgress,
} from '@/features/reminders/hooks/useReminderMutations';
import type { ReminderBoardItem } from '@/features/reminders/types/reminders.types';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

// Acción pendiente de confirmación con la ventanita propia de la app
// (ConfirmDialog) -- reemplaza el Alert.alert nativo del sistema.
type ConfirmAction =
  | { kind: 'skip'; item: ReminderBoardItem }
  | { kind: 'delete'; item: ReminderBoardItem };

/** "Recordatorios" (A10) -- dosis + citas + seguimiento en un solo tablero. */
export default function RemindersRoute() {
  const router = useRouter();
  const { board, isLoading, isError, refetch } = useReminderBoard();
  const { showFeedback } = useFeedback();
  const { activePatient, role } = useShellContext();
  const canManage =
    role !== 'caregiver' || canManagePatientData(activePatient?.accessLevel ?? null);

  const registerDose = useRegisterDose();
  const skipDose = useSkipDose();
  const postponeDose = usePostponeDose();
  const updateProgress = useUpdateReminderProgress();
  const markDone = useMarkReminderDone();
  const deleteReminder = useDeleteReminder();

  // Item de dosis que se está por posponer: controla la visibilidad de
  // PostponeDoseModal (null = modal cerrado).
  const [postponeTarget, setPostponeTarget] = useState<ReminderBoardItem | null>(null);

  // Omitir dosis / Eliminar recordatorio comparten una sola ventanita de
  // confirmación (ConfirmDialog).
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Item de seguimiento al que se le está por actualizar el avance:
  // controla la visibilidad de ProgressUpdateModal (null = modal cerrado).
  const [progressTarget, setProgressTarget] = useState<ReminderBoardItem | null>(null);

  // Se llena justo cuando un avance recién actualizado alcanza el
  // objetivo (y antes NO lo había alcanzado) -- controla la ventanita
  // festiva de GoalCompleteModal.
  const [celebration, setCelebration] = useState<{
    title: string;
    objetivoCantidad: number;
    unidad: string;
  } | null>(null);

  const registeringId =
    registerDose.isPending && registerDose.variables
      ? `dosis-${registerDose.variables.horarioId}`
      : null;
  const skippingId =
    skipDose.isPending && skipDose.variables
      ? `dosis-${skipDose.variables.horarioId}`
      : null;
  const postponingId =
    postponeDose.isPending && postponeDose.variables
      ? `dosis-${postponeDose.variables.horarioId}`
      : null;
  const addingProgressId =
    updateProgress.isPending && updateProgress.variables
      ? `seguimiento-${updateProgress.variables.id}`
      : null;
  const markingDoneId =
    markDone.isPending && markDone.variables !== undefined
      ? `seguimiento-${markDone.variables}`
      : null;
  const deletingId =
    deleteReminder.isPending && deleteReminder.variables !== undefined
      ? `seguimiento-${deleteReminder.variables}`
      : null;

  function handleRegisterDose(item: ReminderBoardItem) {
    if (!item.horarioId || !item.hora) return;
    registerDose.mutate({ horarioId: item.horarioId, hora: item.hora });
  }

  function handleSkipDose(item: ReminderBoardItem) {
    if (!item.horarioId || !item.hora) return;
    setConfirmAction({ kind: 'skip', item });
  }

  function handlePostponeDose(item: ReminderBoardItem) {
    if (!item.horarioId || !item.hora) return;
    setPostponeTarget(item);
  }

  function handleCancelPostpone() {
    setPostponeTarget(null);
  }

  function handleConfirmPostpone(nuevaHora: string) {
    if (!postponeTarget?.horarioId) return;

    postponeDose.mutate(
      { horarioId: postponeTarget.horarioId, hora: nuevaHora },
      {
        onSuccess: () => {
          setPostponeTarget(null);
          showFeedback('Recordatorio pospuesto.', 'success');
        },
        onError: () =>
          showFeedback('No pudimos posponer el recordatorio. Intenta de nuevo.', 'error'),
      },
    );
  }

  function handleAddProgress(item: ReminderBoardItem) {
    if (item.recordatorioId === undefined || item.objetivoCantidad == null) return;
    setProgressTarget(item);
  }

  function handleCancelProgress() {
    setProgressTarget(null);
  }

  function handleConfirmProgress(nuevoProgreso: number) {
    if (progressTarget?.recordatorioId === undefined || progressTarget.objetivoCantidad == null) {
      return;
    }

    const { objetivoCantidad } = progressTarget;
    const yaEstabaCompleto = (progressTarget.progresoActual ?? 0) >= objetivoCantidad;
    const quedaCompleto = !yaEstabaCompleto && nuevoProgreso >= objetivoCantidad;
    const { title, unidad } = progressTarget;

    updateProgress.mutate(
      { id: progressTarget.recordatorioId, progresoActual: nuevoProgreso },
      {
        onSuccess: () => {
          setProgressTarget(null);
          if (quedaCompleto) {
            // La ventanita festiva reemplaza el toast normal -- es el
            // momento más importante para notarlo.
            setCelebration({ title, objetivoCantidad, unidad: unidad ?? '' });
          } else {
            showFeedback('Avance actualizado.', 'success');
          }
        },
        onError: () =>
          showFeedback('No pudimos actualizar el avance. Intenta de nuevo.', 'error'),
      },
    );
  }

  function handleCloseCelebration() {
    setCelebration(null);
  }

  function handleMarkDone(item: ReminderBoardItem) {
    if (item.recordatorioId === undefined) return;
    markDone.mutate(item.recordatorioId);
  }

  function handleDeleteReminder(item: ReminderBoardItem) {
    if (item.recordatorioId === undefined) return;
    setConfirmAction({ kind: 'delete', item });
  }

  function handleEditReminder(item: ReminderBoardItem) {
    if (item.recordatorioId === undefined) return;
    router.push({
      pathname: '/(app)/reminders/new',
      params: { id: String(item.recordatorioId) },
    });
  }

  function handleCancelConfirm() {
    setConfirmAction(null);
  }

  function handleConfirmConfirmAction() {
    if (!confirmAction) return;

    if (confirmAction.kind === 'skip') {
      const { item } = confirmAction;
      if (!item.horarioId || !item.hora) {
        setConfirmAction(null);
        return;
      }
      skipDose.mutate(
        { horarioId: item.horarioId, hora: item.hora },
        {
          onSuccess: () => {
            setConfirmAction(null);
            showFeedback('La dosis ha sido omitida.', 'success');
          },
          onError: () => {
            setConfirmAction(null);
            showFeedback('No pudimos omitir la dosis. Intenta de nuevo.', 'error');
          },
        },
      );
      return;
    }

    const { item } = confirmAction;
    if (item.recordatorioId === undefined) {
      setConfirmAction(null);
      return;
    }
    deleteReminder.mutate(item.recordatorioId, {
      onSuccess: () => {
        setConfirmAction(null);
        showFeedback('Recordatorio eliminado.', 'success');
      },
      onError: () => {
        setConfirmAction(null);
        showFeedback('No pudimos eliminar el recordatorio. Intenta de nuevo.', 'error');
      },
    });
  }

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando tus recordatorios"
        message="Estamos preparando tu día."
      />
    );
  }

  if (isError) {
    return (
      <FullScreenState
        title="No pudimos cargar tus recordatorios"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  const sectionProps = {
    registeringId,
    onRegisterDose: handleRegisterDose,
    skippingId,
    onSkipDose: handleSkipDose,
    postponingId,
    onPostponeDose: handlePostponeDose,
    addingProgressId,
    onAddProgress: handleAddProgress,
    markingDoneId,
    onMarkDone: handleMarkDone,
    deletingId,
    onDelete: handleDeleteReminder,
    onEdit: handleEditReminder,
    canManage,
  };

  const isConfirmSubmitting =
    confirmAction?.kind === 'skip' ? skipDose.isPending : deleteReminder.isPending;

  return (
    <Screen scrollable contentClassName="px-0 py-0" tint="medication">
      <AppHeader title="Recordatorios" subtitle="Mantente al día con tu bienestar." />

      <View className="gap-6 px-4 py-4">
        <ReminderSection
          title="Próximamente"
          items={board.proximamente}
          emptyMessage="No tienes recordatorios próximos."
          {...sectionProps}
        />

        <ReminderSection
          title="Más tarde"
          items={board.masTarde}
          emptyMessage="No tienes más recordatorios por hoy."
          {...sectionProps}
        />

        {canManage ? (
          <Link href="/(app)/reminders/new" asChild>
            <AppButton title="+ Añadir Nuevo Recordatorio" variant="ghost" />
          </Link>
        ) : null}
      </View>

      <PostponeDoseModal
        visible={postponeTarget !== null}
        medicamentoNombre={postponeTarget?.title ?? ''}
        isSubmitting={postponeDose.isPending}
        onCancel={handleCancelPostpone}
        onConfirm={handleConfirmPostpone}
      />

      <ConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction?.kind === 'delete' ? 'Eliminar recordatorio' : 'Omitir dosis'}
        message={
          confirmAction?.kind === 'delete'
            ? `¿Estás segura de eliminar "${confirmAction.item.title}"? Esta acción no se puede deshacer.`
            : `¿Estás segura de omitir la dosis de ${confirmAction?.item.title ?? ''}?`
        }
        confirmLabel={confirmAction?.kind === 'delete' ? 'Eliminar' : 'Aceptar'}
        isSubmitting={isConfirmSubmitting}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmConfirmAction}
      />

      <ProgressUpdateModal
        visible={progressTarget !== null}
        title={progressTarget?.title ?? ''}
        objetivoCantidad={progressTarget?.objetivoCantidad ?? 0}
        unidad={progressTarget?.unidad ?? ''}
        progresoActual={progressTarget?.progresoActual ?? 0}
        isSubmitting={updateProgress.isPending}
        onCancel={handleCancelProgress}
        onConfirm={handleConfirmProgress}
      />

      <GoalCompleteModal
        visible={celebration !== null}
        title={celebration?.title ?? ''}
        objetivoCantidad={celebration?.objetivoCantidad ?? 0}
        unidad={celebration?.unidad ?? ''}
        onClose={handleCloseCelebration}
      />
    </Screen>
  );
}
