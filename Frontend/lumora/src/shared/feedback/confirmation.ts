import { Alert } from 'react-native';

type DestructiveConfirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function confirmDestructive({
  title,
  message,
  confirmLabel,
  onConfirm,
}: DestructiveConfirmation): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
