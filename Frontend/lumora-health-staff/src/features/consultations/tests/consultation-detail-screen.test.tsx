import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/src/shared/api/api-error';
import { ConsultationDetailScreen } from '../screens/ConsultationDetailScreen';

const mockUseAuthSession = jest.fn();
const mockUseConsultation = jest.fn();
const mockUseVitalSigns = jest.fn();
const mockUseClinicalNotes = jest.fn();
const mockUseCreateVitalSigns = jest.fn();
const mockUseCreateClinicalNote = jest.fn();
const mockUseUpdateClinicalNote = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({ useAuthSession: () => mockUseAuthSession() }));
jest.mock('../hooks/use-consultations', () => ({
  useConsultation: () => mockUseConsultation(),
  useVitalSigns: () => mockUseVitalSigns(),
  useClinicalNotes: () => mockUseClinicalNotes(),
  useCreateVitalSigns: () => mockUseCreateVitalSigns(),
  useCreateClinicalNote: () => mockUseCreateClinicalNote(),
  useUpdateClinicalNote: () => mockUseUpdateClinicalNote(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

const consultation = {
  id: 41, expediente_id: 7, paciente_id: 3, profesional_id: 9, motivo_consulta_id: 1,
  fecha_consulta: '2026-08-28T10:00:00.000Z', motivo: 'Control', sintomas: 'Cefalea',
  evaluacion: 'Estable', indicaciones: null, observaciones: null, activo: true,
};
const note = {
  id: 61, consulta_id: 41, autor_id: 9001, contenido: 'Nota inicial',
  created_at: '2026-08-28T10:10:00.000Z', updated_at: '2026-08-28T10:10:00.000Z', activo: true,
};

function mutation(error: unknown = null) { return { mutateAsync: jest.fn(), isPending: false, error }; }

function defaults() {
  mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
  mockUseConsultation.mockReturnValue({ data: consultation, isLoading: false, isError: false });
  mockUseVitalSigns.mockReturnValue({ data: { items: [], total: 0, limit: 5, offset: 0 }, isLoading: false, isError: false });
  mockUseClinicalNotes.mockReturnValue({ data: { items: [note], total: 1, limit: 5, offset: 0 }, isLoading: false, isError: false });
  mockUseCreateVitalSigns.mockReturnValue(mutation());
  mockUseCreateClinicalNote.mockReturnValue(mutation());
  mockUseUpdateClinicalNote.mockReturnValue(mutation());
}

describe('ConsultationDetailScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); defaults(); });

  it('blocks unauthorized clinical access', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<ConsultationDetailScreen consultationId={41} patientId={3} />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('shows note author and dates without editable author/date controls', async () => {
    const screen = await render(<ConsultationDetailScreen consultationId={41} patientId={3} />);
    expect(screen.getByText(/Autor #9001/)).toBeTruthy();
    expect(screen.queryByLabelText(/Autor/i)).toBeNull();
    expect(screen.queryByLabelText(/Fecha de creación/i)).toBeNull();
  });

  it('validates and converts vital signs using J03 ranges', async () => {
    const createVitals = mutation();
    createVitals.mutateAsync.mockResolvedValue({ id: 1 });
    mockUseCreateVitalSigns.mockReturnValue(createVitals);
    const screen = await render(<ConsultationDetailScreen consultationId={41} patientId={3} />);
    await fireEvent.changeText(screen.getByLabelText('Temperatura (°C)'), '55');
    await fireEvent.press(screen.getByText('Guardar signos vitales'));
    expect(await screen.findByText('Temperatura: máximo 45.')).toBeTruthy();
    expect(createVitals.mutateAsync).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Temperatura (°C)'), '36.7');
    await fireEvent.changeText(screen.getByLabelText('Presión sistólica'), '120');
    await fireEvent.press(screen.getByText('Guardar signos vitales'));
    await waitFor(() => expect(createVitals.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ temperatura_c: 36.7, presion_sistolica: 120 })));
  });

  it('creates and edits notes without sending author or timestamps', async () => {
    const createNote = mutation();
    createNote.mutateAsync.mockResolvedValue({ id: 62 });
    const updateNote = mutation();
    updateNote.mutateAsync.mockResolvedValue({ ...note, contenido: 'Nota actualizada' });
    mockUseCreateClinicalNote.mockReturnValue(createNote);
    mockUseUpdateClinicalNote.mockReturnValue(updateNote);
    const screen = await render(<ConsultationDetailScreen consultationId={41} patientId={3} />);

    await fireEvent.changeText(screen.getByLabelText('Contenido de nota clínica'), 'Nueva observación');
    await fireEvent.press(screen.getByText('Crear nota'));
    await waitFor(() => expect(createNote.mutateAsync).toHaveBeenCalledWith({ contenido: 'Nueva observación', activo: true }));
    expect(createNote.mutateAsync.mock.calls[0][0]).not.toHaveProperty('autor_id');
    expect(createNote.mutateAsync.mock.calls[0][0]).not.toHaveProperty('created_at');

    await fireEvent.press(screen.getByText('Editar nota'));
    await fireEvent.changeText(screen.getByLabelText('Contenido de nota clínica'), 'Nota actualizada');
    await fireEvent.press(screen.getByText('Guardar nota'));
    await waitFor(() => expect(updateNote.mutateAsync).toHaveBeenCalledWith({ contenido: 'Nota actualizada', activo: true }));
  });

  it.each([
    [new ApiError('forbidden', 'forbidden', 403), 'No tenés permiso para modificar información clínica.'],
    [new ApiError('not found', 'not_found', 404), 'La consulta ya no está disponible.'],
    [new ApiError('validation', 'validation_error', 422), 'FastAPI rechazó los datos. Revisá los valores ingresados.'],
  ])('translates vital mutation errors', async (error, message) => {
    mockUseCreateVitalSigns.mockReturnValue(mutation(error));
    const screen = await render(<ConsultationDetailScreen consultationId={41} patientId={3} />);
    expect(screen.getByText(message)).toBeTruthy();
  });
});
