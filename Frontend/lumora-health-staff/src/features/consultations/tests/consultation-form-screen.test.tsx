import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/src/shared/api/api-error';
import { ConsultationFormScreen } from '../screens/ConsultationFormScreen';

const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseConsultationReasons = jest.fn();
const mockUseConsultation = jest.fn();
const mockUseCreateConsultation = jest.fn();
const mockUseUpdateConsultation = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({ useAuthSession: () => mockUseAuthSession() }));
jest.mock('@/src/features/profile/hooks/use-professionals', () => ({ useCurrentProfessional: () => mockUseCurrentProfessional() }));
jest.mock('../hooks/use-consultations', () => ({
  useConsultationReasons: () => mockUseConsultationReasons(),
  useConsultation: () => mockUseConsultation(),
  useCreateConsultation: () => mockUseCreateConsultation(),
  useUpdateConsultation: () => mockUseUpdateConsultation(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

function mutation(error: unknown = null) {
  return { mutateAsync: jest.fn(), isPending: false, error };
}

describe('ConsultationFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseCurrentProfessional.mockReturnValue({ data: { id: 99 }, isLoading: false, isError: false });
    mockUseConsultationReasons.mockReturnValue({ data: { items: [{ id: 5, nombre: 'Control', activo: true }], total: 1, limit: 100, offset: 0 }, isLoading: false, isError: false });
    mockUseConsultation.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    mockUseCreateConsultation.mockReturnValue(mutation());
    mockUseUpdateConsultation.mockReturnValue(mutation());
  });

  it('does not allow selecting a different professional and requires motive', async () => {
    const screen = await render(<ConsultationFormScreen patientId={3} recordId={7} />);
    expect(screen.getByText(/Profesional #99/)).toBeTruthy();
    expect(screen.queryByText(/Seleccionar profesional/i)).toBeNull();
    await fireEvent.press(screen.getByText('Registrar consulta'));
    expect(await screen.findByText('El motivo de consulta es requerido.')).toBeTruthy();
  });

  it('creates consultation bound to record, patient and authenticated professional', async () => {
    const create = mutation();
    create.mutateAsync.mockResolvedValue({ id: 88 });
    mockUseCreateConsultation.mockReturnValue(create);
    const screen = await render(<ConsultationFormScreen patientId={3} recordId={7} />);
    await fireEvent.changeText(screen.getByLabelText('Motivo de consulta'), 'Control de seguimiento');
    await fireEvent.press(screen.getByText('Control'));
    await fireEvent.press(screen.getByText('Registrar consulta'));
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledTimes(1));
    expect(create.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expediente_id: 7, paciente_id: 3, profesional_id: 99, motivo_consulta_id: 5, motivo: 'Control de seguimiento' }));
    expect(mockReplace).toHaveBeenCalledWith('/(staff)/patients/3/record/consultations/88');
  });

  it('preserves consultation attribution and clears optional text safely when editing', async () => {
    const update = mutation();
    update.mutateAsync.mockResolvedValue({ id: 41 });
    mockUseUpdateConsultation.mockReturnValue(update);
    mockUseConsultation.mockReturnValue({
      data: {
        id: 41,
        expediente_id: 7,
        paciente_id: 3,
        profesional_id: 9,
        motivo_consulta_id: 5,
        fecha_consulta: '2026-08-28T10:00:00.000Z',
        motivo: 'Control',
        sintomas: 'Cefalea',
        evaluacion: 'Estable',
        indicaciones: 'Reposo',
        observaciones: 'Seguimiento',
        activo: true,
      },
      isLoading: false,
      isError: false,
    });

    const screen = await render(
      <ConsultationFormScreen consultationId={41} patientId={3} recordId={7} />,
    );
    await waitFor(() => expect(screen.getByLabelText('Síntomas').props.value).toBe('Cefalea'));
    expect(screen.getByText(/Profesional #9/)).toBeTruthy();
    expect(screen.queryByText('Sin catálogo')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Fecha de consulta'), '');
    await fireEvent.changeText(screen.getByLabelText('Síntomas'), '');
    await fireEvent.changeText(screen.getByLabelText('Evaluación'), '');
    await fireEvent.changeText(screen.getByLabelText('Indicaciones'), '');
    await fireEvent.changeText(screen.getByLabelText('Observaciones'), '');
    await fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
    const payload = update.mutateAsync.mock.calls[0][0];
    expect(payload).not.toHaveProperty('profesional_id');
    expect(payload).not.toHaveProperty('fecha_consulta');
    expect(payload).toEqual(expect.objectContaining({
      motivo_consulta_id: 5, sintomas: '', evaluacion: '', indicaciones: '', observaciones: '',
    }));
  });

  it.each([
    [new ApiError('forbidden', 'forbidden', 403), 'No tenés permiso para guardar consultas clínicas.'],
    [new ApiError('not found', 'not_found', 404), 'El expediente, paciente, profesional o motivo seleccionado ya no está disponible.'],
    [new ApiError('validation', 'validation_error', 422), 'El servidor rechazó uno o más datos. Revisá el formulario.'],
  ])('translates J03 errors', async (error, expected) => {
    mockUseCreateConsultation.mockReturnValue(mutation(error));
    const screen = await render(<ConsultationFormScreen patientId={3} recordId={7} />);
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
