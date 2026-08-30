import { RemoteState, type RemoteStateKind } from '@/shared/components/RemoteState';
import { Screen } from '@/shared/components/Screen';
import { presentApiError } from '@/shared/api/api-error';

type FullScreenStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: RemoteStateKind;
};

/** Estado reutilizable para offline, acceso denegado y errores de pantalla. */
export function FullScreenState({
  title,
  message,
  actionLabel,
  onAction,
  kind,
}: FullScreenStateProps) {
  const resolvedKind = kind ?? (title.startsWith('Cargando') ? 'loading' : 'error');

  return (
    <Screen contentClassName="items-center justify-center">
      <RemoteState
        kind={resolvedKind}
        title={title}
        message={message}
        actionLabel={actionLabel}
        onAction={onAction}
      />
    </Screen>
  );
}

export function FullScreenApiError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const presentation = presentApiError(error);

  return (
    <FullScreenState
      kind={presentation.kind}
      title={presentation.title}
      message={presentation.message}
      actionLabel={onRetry ? 'Reintentar' : undefined}
      onAction={onRetry}
    />
  );
}
