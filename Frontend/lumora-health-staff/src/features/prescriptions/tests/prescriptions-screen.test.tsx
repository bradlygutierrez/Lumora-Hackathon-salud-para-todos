import { fireEvent, render } from '@testing-library/react-native';

import { PrescriptionsScreen } from '../screens/PrescriptionsScreen';

const mockUseAuthSession = jest.fn();
const mockUsePatientPrescriptions = jest.fn();
const mockUsePrescriptionStatuses = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-prescriptions', () => ({
  usePatientPrescriptions: (...args: unknown[]) =>
    mockUsePatientPrescriptions(...args),
  usePrescriptionStatuses: (...args: unknown[]) =>
    mockUsePrescriptionStatuses(...args),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const professional = {
  id: 101,
  especialidad: 'Medicina interna',
  numero_licencia: 'LIC-101',
  persona: {
    id: 8001,
    nombres: 'Daniel',
    apellidos: 'Rojas',
  },
};

const active = {
  id: 'rx-active',
  paciente_id: 101,
  profesional_id: 101,
  consulta_id: null,
  estado_id: 10,
  titulo: 'Tratamiento activo',
  fecha_emision: '2026-08-20T12:00:00.000Z',
  vigencia_hasta: null,
  observaciones: null,
  created_at: '2026-08-20T12:00:00.000Z',
  detalles: [],
  profesional: professional,
};

const historical = { ...active, id: 'rx-old', estado_id: 11, titulo: 'Tratamiento anterior' };

describe('PrescriptionsScreen J13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
    });
    mockUsePatientPrescriptions.mockReturnValue({
      data: [active, historical],
      isLoading: false,
      isError: false,
    });
    mockUsePrescriptionStatuses.mockReturnValue({
      data: {
        items: [
          { id: 10, nombre: 'Activa' },
          { id: 11, nombre: 'Completada' },
        ],
      },
      isLoading: false,
      isError: false,
    });
  });

  it('blocks access without clinica:manage and disables patient prescription query', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(
      <PrescriptionsScreen patientId={101} recordId={7001} />,
    );

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(mockUsePatientPrescriptions).toHaveBeenCalledWith(101, false);
    expect(mockUsePrescriptionStatuses).toHaveBeenCalledWith(false);
  });

  it('resolves active versus history using catalog names, not hardcoded ids', async () => {
    const screen = await render(
      <PrescriptionsScreen patientId={101} recordId={7001} />,
    );

    expect(screen.getByText('Tratamiento activo')).toBeTruthy();
    expect(screen.queryByText('Tratamiento anterior')).toBeNull();

    await fireEvent.press(screen.getByText('Historial'));

    expect(screen.getByText('Tratamiento anterior')).toBeTruthy();
    expect(screen.queryByText('Tratamiento activo')).toBeNull();
  });

  it('navigates to prescription creation and detail preserving record context', async () => {
    const screen = await render(
      <PrescriptionsScreen patientId={101} recordId={7001} />,
    );

    await fireEvent.press(screen.getByLabelText('Prescribir medicamento'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/101/prescriptions/new?recordId=7001',
    );

    await fireEvent.press(screen.getByLabelText('Abrir receta Tratamiento activo'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/101/prescriptions/rx-active?recordId=7001',
    );
  });
});
