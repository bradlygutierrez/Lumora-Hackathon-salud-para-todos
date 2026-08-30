import { render } from '@testing-library/react-native';

import { PrescriptionDetailScreen } from '../screens/PrescriptionDetailScreen';

const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockHook = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('@/src/features/profile/hooks/use-professionals', () => ({
  useCurrentProfessional: () => mockUseCurrentProfessional(),
}));
jest.mock('../hooks/use-prescriptions', () => ({
  usePrescription: (...args: unknown[]) => mockHook('prescription', ...args),
  usePrescriptionStatuses: (...args: unknown[]) => mockHook('statuses', ...args),
  usePrescriptionMedications: (...args: unknown[]) => mockHook('medications', ...args),
  useAdministrationRoutes: (...args: unknown[]) => mockHook('routes', ...args),
  useMeasurementUnits: (...args: unknown[]) => mockHook('units', ...args),
  useUpdatePrescription: (...args: unknown[]) => mockHook('updatePrescription', ...args),
  useCreatePrescriptionDetail: (...args: unknown[]) => mockHook('createDetail', ...args),
  useDeletePrescriptionDetail: (...args: unknown[]) => mockHook('deleteDetail', ...args),
  useUpdatePrescriptionDetail: (...args: unknown[]) => mockHook('updateDetail', ...args),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
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

const prescriptionResult = {
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

const statusesResult = {
  data: { items: [{ id: 1, nombre: 'Activa' }] },
  isLoading: false,
  isError: false,
};

const medicationsResult = {
  data: [],
  isLoading: false,
  isError: false,
};

const emptyCatalogResult = {
  data: { items: [] },
  isLoading: false,
  isError: false,
};

const mutationResult = {
  mutateAsync: jest.fn(),
  isPending: false,
  error: null,
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
    mockHook.mockImplementation((name: string) => {
      if (name === 'prescription') return prescriptionResult;
      if (name === 'statuses') return statusesResult;
      if (name === 'medications') return medicationsResult;
      if (name === 'routes' || name === 'units') return emptyCatalogResult;
      return mutationResult;
    });
  });

  it('keeps another professional prescription read-only in the UI', () => {
    const screen = render(
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
