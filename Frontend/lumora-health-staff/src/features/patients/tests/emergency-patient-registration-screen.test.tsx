import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/src/shared/api/api-error';
import { EmergencyPatientRegistrationScreen } from '../screens/EmergencyPatientRegistrationScreen';

const mockUseRegisterEmergencyPatient = jest.fn();
const mockUsePatientCatalogs = jest.fn();
const mockUseAuthSession = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

jest.mock('../hooks/use-patients', () => ({
  useRegisterEmergencyPatient: () => mockUseRegisterEmergencyPatient(),
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
      data: { items: [], total: 0, limit: 100, offset: 0 },
      isLoading: false,
      isError: false,
    },
  };
}

describe('EmergencyPatientRegistrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUsePatientCatalogs.mockReturnValue(catalogs());
    mockUseRegisterEmergencyPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
    });
  });

  it('blocks staff without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<EmergencyPatientRegistrationScreen />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('only requires name, surname and motivo -- no address or account fields', async () => {
    const screen = await render(<EmergencyPatientRegistrationScreen />);

    expect(screen.getByText('Registro de emergencia')).toBeTruthy();
    expect(screen.queryByLabelText('Dirección')).toBeNull();
    expect(screen.queryByText(/Nombre de usuario/i)).toBeNull();
    expect(screen.queryByText(/Contraseña/i)).toBeNull();

    await fireEvent.press(screen.getByText('Registrar y comenzar atención'));
    expect(await screen.findByText('Ingresá al menos un nombre')).toBeTruthy();
    expect(screen.getByText('Ingresá al menos un apellido, aunque sea provisional')).toBeTruthy();
    expect(screen.getByText('Describí el motivo de la atención')).toBeTruthy();
  });

  it('prevents duplicate submission while the mutation is pending', async () => {
    mockUseRegisterEmergencyPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
      error: null,
    });
    const screen = await render(<EmergencyPatientRegistrationScreen />);
    expect(screen.getByLabelText('Registrar y comenzar atención')).toBeDisabled();
  });

  it('translates a forbidden response into a professional-profile hint', async () => {
    mockUseRegisterEmergencyPatient.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: new ApiError('forbidden', 'forbidden', 403),
    });
    const screen = await render(<EmergencyPatientRegistrationScreen />);
    expect(
      screen.getByText(
        'No tenés permiso para registrar pacientes, o tu usuario no tiene un perfil profesional vinculado.',
      ),
    ).toBeTruthy();
  });

  it('submits without a contacto_emergencia when the companion fields are left empty, and navigates to the consultation', async () => {
    const mutateAsync = jest
      .fn()
      .mockResolvedValue({ paciente: { id: 42 }, expediente_id: 7, consulta_id: 99 });
    mockUseRegisterEmergencyPatient.mockReturnValue({ mutateAsync, isPending: false, error: null });
    const screen = await render(<EmergencyPatientRegistrationScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nombres'), 'Sin Identificar');
    await fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Provisional');
    await fireEvent.changeText(
      screen.getByLabelText('Motivo de la atención'),
      'Trauma en pierna derecha, consciente',
    );
    await fireEvent.press(screen.getByText('Registrar y comenzar atención'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.persona.nombres).toBe('Sin Identificar');
    expect(payload.contacto_emergencia).toBeUndefined();
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('password');
    expect(mockReplace).toHaveBeenCalledWith('/(staff)/patients/42/record/consultations/99');
  });

  it('requires the three companion fields together, not partially', async () => {
    const mutateAsync = jest.fn();
    mockUseRegisterEmergencyPatient.mockReturnValue({ mutateAsync, isPending: false, error: null });
    const screen = await render(<EmergencyPatientRegistrationScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nombres'), 'Sin Identificar');
    await fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Provisional');
    await fireEvent.changeText(
      screen.getByLabelText('Motivo de la atención'),
      'Trauma en pierna derecha, consciente',
    );
    await fireEvent.changeText(screen.getByLabelText('Nombre del acompañante'), 'Ana Pérez');
    await fireEvent.press(screen.getByText('Registrar y comenzar atención'));

    expect(
      await screen.findByText('Completá nombre, parentesco y teléfono del acompañante, o dejalos todos vacíos'),
    ).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('includes the contacto_emergencia when all three companion fields are provided', async () => {
    const mutateAsync = jest
      .fn()
      .mockResolvedValue({ paciente: { id: 42 }, expediente_id: 7, consulta_id: 99 });
    mockUseRegisterEmergencyPatient.mockReturnValue({ mutateAsync, isPending: false, error: null });
    const screen = await render(<EmergencyPatientRegistrationScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nombres'), 'Sin Identificar');
    await fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Provisional');
    await fireEvent.changeText(
      screen.getByLabelText('Motivo de la atención'),
      'Trauma en pierna derecha, consciente',
    );
    await fireEvent.changeText(screen.getByLabelText('Nombre del acompañante'), 'Ana Pérez');
    await fireEvent.changeText(screen.getByLabelText('Parentesco del acompañante'), 'Madre');
    await fireEvent.changeText(screen.getByLabelText('Teléfono del acompañante'), '7777-7777');
    await fireEvent.press(screen.getByText('Registrar y comenzar atención'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.contacto_emergencia).toEqual({
      nombre: 'Ana Pérez',
      parentesco: 'Madre',
      telefono: '7777-7777',
    });
  });
});
