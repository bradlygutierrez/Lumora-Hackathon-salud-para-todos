import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style ?? {} },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

import { PasswordField } from '@/features/auth/components/PasswordField';
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge';
import { AppButton } from '@/shared/components/AppButton';
import { AppTextInput } from '@/shared/components/AppTextInput';
import { FullScreenApiError, FullScreenState } from '@/shared/components/FullScreenState';
import { ApiError } from '@/shared/api/api-error';
import { GlobalErrorBoundary } from '@/shared/components/GlobalErrorBoundary';
import { RemoteState } from '@/shared/components/RemoteState';

describe('B13 shared accessible UI', () => {
  it('represents loading, empty, error and offline states', async () => {
    const { getByLabelText, getByText, rerender } = await render(
      <RemoteState kind="loading" title="Cargando" message="Esperá un momento." />,
    );
    expect(getByLabelText('Cargando. Esperá un momento.')).toHaveProp(
      'accessibilityRole',
      'progressbar',
    );

    await rerender(<RemoteState kind="empty" title="Sin resultados" message="No hay elementos." />);
    expect(getByText('Sin resultados')).toBeTruthy();

    await rerender(<RemoteState kind="error" title="Error" message="Intentá nuevamente." />);
    expect(getByText('Error')).toBeTruthy();

    const offline = await render(
      <FullScreenState kind="offline" title="Sin conexión" message="Revisá Internet." />,
    );
    expect(offline.getByText('Sin conexión')).toBeTruthy();
  });

  it.each([
    ['NETWORK_ERROR', 0, true],
    ['SERVER_ERROR', 500, true],
    ['FORBIDDEN', 403, false],
    ['NOT_FOUND', 404, false],
    ['VALIDATION', 422, false],
  ] as const)('offers retry only for safe error %s', async (code, status, showsRetry) => {
    const view = await render(
      <FullScreenApiError
        error={new ApiError(code, status || null, 'internal')}
        onRetry={jest.fn()}
      />,
    );
    expect(Boolean(view.queryByLabelText('Reintentar'))).toBe(showsRetry);
  });

  it('exposes button disabled and busy states', async () => {
    const { getByLabelText } = await render(<AppButton title="Guardar" loading />);
    expect(getByLabelText('Guardar')).toHaveProp('accessibilityState', {
      busy: true,
      disabled: true,
    });
  });

  it('announces form errors and relates them to the field', async () => {
    const { getByLabelText, getByRole } = await render(
      <AppTextInput label="Correo" error="Correo inválido" />,
    );
    expect(getByLabelText('Correo')).toHaveProp('aria-invalid', true);
    expect(getByRole('alert')).toHaveTextContent('Correo inválido');
  });

  it('labels the password visibility control and reports expansion', async () => {
    const { getByLabelText } = await render(<PasswordField label="Contraseña" />);
    const toggle = getByLabelText('Mostrar contraseña');
    await act(() => fireEvent.press(toggle));
    expect(getByLabelText('Ocultar contraseña')).toHaveProp('accessibilityState', {
      expanded: true,
    });
  });

  it('adds text, icon and an accessible label to appointment status', async () => {
    const { getByLabelText, getByText } = await render(
      <AppointmentStatusBadge status="Confirmada" />,
    );
    expect(getByLabelText('Estado de la cita: Confirmada')).toBeTruthy();
    expect(getByText('Confirmada')).toBeTruthy();
  });

  it('renders children normally', async () => {
    const { getByText } = await render(
      <GlobalErrorBoundary><Text>Contenido normal</Text></GlobalErrorBoundary>,
    );
    expect(getByText('Contenido normal')).toBeTruthy();
  });

  it('recovers after an unexpected render error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;
    function FlakyChild() {
      if (shouldThrow) {
        throw new Error('render failed');
      }
      return <Text>Contenido recuperado</Text>;
    }

    const { getByLabelText, getByText } = await render(
      <GlobalErrorBoundary><FlakyChild /></GlobalErrorBoundary>,
    );
    expect(getByText('Algo salió mal')).toBeTruthy();
    shouldThrow = false;
    await act(() => fireEvent.press(getByLabelText('Intentar nuevamente')));
    expect(getByText('Contenido recuperado')).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
