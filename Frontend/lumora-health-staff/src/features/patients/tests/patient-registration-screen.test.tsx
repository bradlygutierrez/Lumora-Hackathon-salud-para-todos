import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/src/shared/api/api-error';
import { PatientRegistrationScreen } from '../screens/PatientRegistrationScreen';

const mockUseRegisterPatient = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUseAuthSession = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../hooks/use-patients', () => ({
  useRegisterPatient: () => mockUseRegisterPatient(),
  usePatientCatalogs: () => mockUsePatientCatalogs(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

function catalogs() {
  return {
    sexes: {
      data: { items: [{ id: 1, nombre: 'Masculino' }], total: 1, limit: 100, offset: 0 },
      isLoading: false,
      isError: false,
    },
    bloodTypes: {
      data: { items: [{ id: 2, nombre: 'O+' }], total: 1, limit: 100, offset: 0 },
      isLoading: false,
      isError: false,
    },
  };
}

describe('PatientRegistrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUsePatientCatalogs.mockReturnValue(catalogs());
    mockUseRegisterPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
    });
  });

  it('does not request account credentials and validates required clinical registration fields', async () => {
    const screen = await render(<PatientRegistrationScreen />);

    expect(screen.getByText('Registro de Nuevo Paciente')).toBeTruthy();
    expect(screen.queryByText(/Nombre de usuario/i)).toBeNull();
    expect(screen.queryByText(/Contraseña/i)).toBeNull();

    await fireEvent.press(screen.getByText('Guardar Paciente'));
    expect(await screen.findByText('Ingresá los nombres')).toBeTruthy();
    expect(screen.getByText('Ingresá los apellidos')).toBeTruthy();
    expect(screen.getByText('Seleccioná el sexo')).toBeTruthy();
  });

  it('prevents duplicate submission while the mutation is pending', async () => {
    mockUseRegisterPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
      error: null,
    });
    const screen = await render(<PatientRegistrationScreen />);
    expect(screen.getByLabelText('Guardar paciente')).toBeDisabled();
  });

  it.each([
    [new ApiError('conflict', 'conflict', 409), 'Ya existe un registro relacionado con estos datos.'],
    [new ApiError('validation', 'validation_error', 422), 'Revisá los campos del formulario.'],
  ])('translates backend registration errors safely', async (error, message) => {
    mockUseRegisterPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error,
    });
    const screen = await render(<PatientRegistrationScreen />);
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('submits Persona + Paciente + contacto without creating user credentials', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: 42 });
    mockUseRegisterPatient.mockReturnValue({ mutateAsync, isPending: false, error: null });
    const screen = await render(<PatientRegistrationScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nombres'), 'Juan');
    await fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Pérez');
    await fireEvent.press(screen.getByLabelText('Fecha de nacimiento'));
    await fireEvent(screen.getByTestId('date-time-picker'), 'onChange', {}, new Date(1995, 2, 2));
    await fireEvent.changeText(screen.getByLabelText('Teléfono'), '8888-8888');
    await fireEvent.press(screen.getByText('Masculino'));
    await fireEvent.changeText(screen.getByLabelText('Dirección'), 'Bolonia');
    await fireEvent.changeText(screen.getByLabelText('Ciudad'), 'Managua');
    await fireEvent.changeText(screen.getByLabelText('Contacto de emergencia'), 'Ana Pérez');
    await fireEvent.changeText(screen.getByLabelText('Parentesco'), 'Madre');
    await fireEvent.changeText(screen.getByLabelText('Teléfono del contacto'), '7777-7777');
    await fireEvent.press(screen.getByText('Guardar Paciente'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.persona.nombres).toBe('Juan');
    expect(payload.persona.direccion.ciudad).toBe('Managua');
    expect(payload.contacto_emergencia.parentesco).toBe('Madre');
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('password');
    expect(mockReplace).toHaveBeenCalledWith('/(staff)/patients/42');
  });
});
