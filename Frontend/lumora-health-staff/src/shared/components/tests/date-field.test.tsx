import { fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DateField } from '../DateField';

const mockOpen = DateTimePickerAndroid.open as jest.Mock;

describe('DateField', () => {
  afterEach(() => {
    Platform.OS = 'ios';
    jest.clearAllMocks();
  });

  it('on Android opens the imperative picker instead of mounting <DateTimePicker> declaratively', async () => {
    // Regresión: montar <DateTimePicker> condicionalmente (el patrón que sí
    // funciona en iOS) rompe la app en Android al desmontarlo, con
    // "Cannot read property 'dismiss' of undefined" -- ahí el picker nativo
    // es un diálogo imperativo, no un componente.
    Platform.OS = 'android';
    const onChange = jest.fn();
    const screen = await render(
      <DateField label="Fecha de nacimiento" onChange={onChange} value={undefined} />,
    );

    await fireEvent.press(screen.getByLabelText('Fecha de nacimiento'));

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'date', display: 'default' }),
    );
    expect(screen.queryByTestId('date-time-picker')).toBeNull();

    const openArgs = mockOpen.mock.calls[0][0];
    openArgs.onChange({}, new Date(1995, 2, 2));
    expect(onChange).toHaveBeenCalledWith('1995-03-02');
  });

  it('on iOS renders the inline picker and formats the selected date', async () => {
    Platform.OS = 'ios';
    const onChange = jest.fn();
    const screen = await render(
      <DateField label="Fecha de nacimiento" onChange={onChange} value={undefined} />,
    );

    await fireEvent.press(screen.getByLabelText('Fecha de nacimiento'));
    expect(mockOpen).not.toHaveBeenCalled();

    const picker = screen.getByTestId('date-time-picker');
    await fireEvent(picker, 'onChange', {}, new Date(1995, 2, 2));

    expect(onChange).toHaveBeenCalledWith('1995-03-02');
  });

  it('on Android opens the time picker directly (no date dialog first) for mode="time"', async () => {
    Platform.OS = 'android';
    const onChange = jest.fn();
    const screen = await render(
      <DateField label="Hora de toma" mode="time" onChange={onChange} value={undefined} />,
    );

    await fireEvent.press(screen.getByLabelText('Hora de toma'));

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'time', display: 'default' }),
    );

    const openArgs = mockOpen.mock.calls[0][0];
    openArgs.onChange({}, new Date(2026, 0, 1, 8, 0, 0));
    expect(onChange).toHaveBeenCalledWith('08:00:00');
  });

  it('on iOS renders the inline time picker and formats HH:MM from a bare time string', async () => {
    Platform.OS = 'ios';
    const onChange = jest.fn();
    const screen = await render(
      <DateField label="Hora de toma" mode="time" onChange={onChange} value="14:30:00" />,
    );

    expect(screen.getByText('02:30 p. m.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Hora de toma'));
    const picker = screen.getByTestId('date-time-picker');
    await fireEvent(picker, 'onChange', {}, new Date(2026, 0, 1, 9, 15, 0));

    expect(onChange).toHaveBeenCalledWith('09:15:00');
  });

  it('shows the error message when provided', async () => {
    const screen = await render(
      <DateField error="Campo requerido" label="Fecha" onChange={jest.fn()} value={undefined} />,
    );
    expect(screen.getByText('Campo requerido')).toBeTruthy();
  });
});
