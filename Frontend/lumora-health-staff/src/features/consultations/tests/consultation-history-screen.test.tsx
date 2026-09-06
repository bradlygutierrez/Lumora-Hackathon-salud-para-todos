import { fireEvent, render } from '@testing-library/react-native';

import { ConsultationHistoryScreen } from '../screens/ConsultationHistoryScreen';

const mockUseConsultations = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockUseAuthSession = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({ useAuthSession: () => mockUseAuthSession() }));
jest.mock('@/src/features/profile/hooks/use-professionals', () => ({ useCurrentProfessional: () => mockUseCurrentProfessional() }));
jest.mock('../hooks/use-consultations', () => ({ useConsultations: (params: unknown) => mockUseConsultations(params) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

const consultation = {
  id: 41,
  expediente_id: 7,
  paciente_id: 3,
  profesional_id: 9,
  motivo_consulta_id: 1,
  fecha_consulta: '2026-08-28T10:00:00.000Z',
  motivo: 'Control',
  sintomas: null,
  evaluacion: 'Estable',
  indicaciones: null,
  observaciones: null,
  activo: true,
};

describe('ConsultationHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseCurrentProfessional.mockReturnValue({ data: { id: 9 }, isLoading: false, isError: false });
    mockUseConsultations.mockReturnValue({ data: { items: [consultation], total: 11, limit: 10, offset: 0 }, isLoading: false, isError: false });
  });

  it('blocks direct access without clinica:manage', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<ConsultationHistoryScreen patientId={3} recordId={7} />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('sends record, professional, active, date and pagination filters to J03', async () => {
    const screen = await render(<ConsultationHistoryScreen patientId={3} recordId={7} />);
    expect(mockUseConsultations).toHaveBeenLastCalledWith(expect.objectContaining({ expediente_id: 7, paciente_id: 3, activo: true, offset: 0 }));

    await fireEvent.press(screen.getByText('Mis consultas'));
    expect(mockUseConsultations).toHaveBeenLastCalledWith(expect.objectContaining({ profesional_id: 9 }));

    await fireEvent.press(screen.getByText('Todas'));
    expect(mockUseConsultations).toHaveBeenLastCalledWith(expect.objectContaining({ activo: undefined }));

    await fireEvent.changeText(screen.getByLabelText('Fecha desde'), '2026-08-01T00:00:00Z');
    expect(mockUseConsultations).toHaveBeenLastCalledWith(expect.objectContaining({ fecha_desde: '2026-08-01T00:00:00Z' }));

    await fireEvent.press(screen.getByText('Siguiente'));
    expect(mockUseConsultations).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 }));
  });

  it('navigates to consultation detail and creation', async () => {
    const screen = await render(<ConsultationHistoryScreen patientId={3} recordId={7} />);
    await fireEvent.press(screen.getByText('Control'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/3/record/consultations/41');
    await fireEvent.press(screen.getByLabelText('Crear consulta clínica'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/3/record/consultations/new?recordId=7');
  });
});
