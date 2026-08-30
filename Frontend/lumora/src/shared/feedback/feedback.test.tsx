import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert, Pressable, Text } from 'react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Alert: { alert: jest.fn() },
  Pressable: 'Pressable',
  StyleSheet: { flatten: (style: unknown) => style ?? {} },
  Text: 'Text',
  View: 'View',
}));

import { FeedbackProvider, useFeedback } from '@/shared/feedback/FeedbackProvider';
import { confirmDestructive } from '@/shared/feedback/confirmation';

function FeedbackHarness() {
  const { showFeedback } = useFeedback();
  return (
    <Pressable
      accessibilityLabel="Mostrar"
      accessibilityRole="button"
      onPress={() => showFeedback('Cambios guardados', 'success')}
    >
      <Text>Mostrar</Text>
    </Pressable>
  );
}

describe('B13 feedback and confirmation', () => {
  it('shows and dismisses non-blocking feedback', async () => {
    const { getByLabelText, getByText, queryByText } = await render(
      <FeedbackProvider><FeedbackHarness /></FeedbackProvider>,
    );
    await act(() => fireEvent.press(getByLabelText('Mostrar')));
    expect(getByText('Cambios guardados')).toBeTruthy();
    await act(() => fireEvent.press(getByLabelText('Cerrar mensaje')));
    expect(queryByText('Cambios guardados')).toBeNull();
  });

  it('supports cancel and confirm for destructive actions', () => {
    const onConfirm = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    confirmDestructive({
      title: 'Cerrar sesión',
      message: '¿Deseas continuar?',
      confirmLabel: 'Cerrar sesión',
      onConfirm,
    });

    const buttons = alertSpy.mock.calls[0][2];
    expect(buttons?.[0]).toMatchObject({ text: 'Cancelar', style: 'cancel' });
    buttons?.[0]?.onPress?.();
    expect(onConfirm).not.toHaveBeenCalled();
    buttons?.[1]?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
