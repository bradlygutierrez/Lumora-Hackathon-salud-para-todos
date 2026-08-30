import { render } from '@testing-library/react-native';

import { PrescriptionDetailScreen } from '../screens/PrescriptionDetailScreen';

const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const hook = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('@/src/features/profile/hooks/use-professionals', () => ({
  useCurrentProfessional: () => mockUseCurrentProfessional(),
}));
jest.mock('../hooks/use-prescriptions', () => ({
  usePrescription: (...args: unknown[]) => hook('prescription', ...args),
  usePrescriptionStatuses: (...args: unknown[]) => hook('statuses', ...args),
  usePrescriptionMedications: (...args: unknown[]) => hook('medications', ...args),
  useAdministrationRoutes: (...args: unknown[]) => hook('routes', ...args),
  useMeasurementUnits: (...args: unknown[]) => hook('units', ...args),
  useUpdatePrescription: (...args: unknown[]) => hook('updatePrescription', ...args),
  useCreatePrescriptionDetail: (...args: unknown[]) => hook('createDetail', ...args),
  useDeletePrescriptionDetail: (...args: unknown[]) => hook('deleteDetail', ...args),
  useUpdatePrescriptionDetail: (...args: unknown[]) => hook('updateDetail', ...args),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
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
  persona: { id: 8001, nombres: 'Daniel', apellidos: 'Rojas' },
};

describe('PrescriptionDetailScreen ownership J13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
    });
    mockUseCurrentProfessional.mockReturnValue({
      data: { ...professional, id: 202 },
      isLoading: false,
    });
    hook.mockImplementation((name: string) => {
      if (name === 'prescription') {
        return {
          data: {
            id: 'rx-1',
            paciente_id: 101,
            profesional_id: 101,
            consulta_id: null,
            estado_id: 1,
            titulo: 'Receta de otro profesional',
            fecha_emision: '2026-08-20T12:00:00.000Z',
            vigencia_hasta: null,
            observaciones: null,
            created_at: '2026-08-20T12:00:00.000Z',
            detalles: [],
            profesional: professional,
          },
          isLoading: false,
          isError: false,
        };
      }
      if (name === 'statuses') {
        return { data: { items: [{ id: 1, nombre: 'Activa' }] }, isLoading: false, isError: false };
      }
      if (name === 'medications') {
        return { data: [], isLoading: false, isError: false };
      }
      if (name === 'routes' || name === 'units') {
        return { data: { items: [] }, isLoading: false, isError: false };
      }
      return { mutateAsync: jest.fn(), isPending: false, error: null };
    });
  });

  it('keeps another professional prescription read-only in the UI', async () => {
    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );

    expect(
      screen.getByText(
        'Esta receta fue emitida por otro profesional. Podés consultarla, pero el backend bloquea su edición y la de sus medicamentos.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Guardar receta')).toBeNull();
    expect(screen.queryByText('Agregar')).toBeNull();
  });
});
