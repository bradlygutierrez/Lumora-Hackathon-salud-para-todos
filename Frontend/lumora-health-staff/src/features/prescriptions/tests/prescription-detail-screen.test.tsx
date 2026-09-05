import { fireEvent, render } from '@testing-library/react-native';

import { PrescriptionDetailScreen } from '../screens/PrescriptionDetailScreen';

const mockUseAuthSession = jest.fn();
const mockUseCurrentProfessional = jest.fn();
const mockHook = jest.fn();
const mockDeleteDetail = jest.fn();
const mockCreateSchedule = jest.fn();
const mockDeleteSchedule = jest.fn();

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
  useMedicationSchedules: (...args: unknown[]) => mockHook('schedules', ...args),
  useCreateMedicationSchedule: (...args: unknown[]) => mockHook('createSchedule', ...args),
  useDeleteMedicationSchedule: (...args: unknown[]) => mockHook('deleteSchedule', ...args),
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

const ownedPrescriptionResult = {
  data: {
    ...prescriptionResult.data,
    titulo: 'Receta propia',
    detalles: [
      {
        id: 'detail-1',
        receta_id: 'rx-1',
        medicamento_id: 'med-1',
        unidad_medida_id: 1,
        via_administracion_id: 1,
        dosis: '500 mg',
        frecuencia: 'Cada 8 horas',
        duracion_dias: 5,
        cantidad_total: 15,
        instrucciones: null,
      },
    ],
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
  data: [{ id: 'med-1', nombre: 'Paracetamol', activo: true }],
  isLoading: false,
  isError: false,
};

const emptyCatalogResult = {
  data: { items: [{ id: 1, nombre: 'Unidad de prueba', activo: true }] },
  isLoading: false,
  isError: false,
};

const mutationResult = {
  mutateAsync: jest.fn(),
  isPending: false,
  error: null,
};

type MedicationScheduleFixture = {
  id: string;
  detalle_receta_id: string;
  hora: string;
  activo: boolean;
  created_at: string;
};

const schedulesResult = {
  data: [] as MedicationScheduleFixture[],
  isLoading: false,
  isError: false,
};

const scheduleWithEntriesResult = {
  data: [{ id: 'schedule-1', detalle_receta_id: 'detail-1', hora: '08:00:00', activo: true, created_at: '2026-08-20T00:00:00Z' }],
  isLoading: false,
  isError: false,
};

const createScheduleMutationResult = {
  mutateAsync: mockCreateSchedule,
  isPending: false,
  error: null,
};

const deleteScheduleMutationResult = {
  mutate: mockDeleteSchedule,
  isPending: false,
  error: null,
};

const deleteDetailMutationResult = {
  mutateAsync: mockDeleteDetail,
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
      if (name === 'deleteDetail') return deleteDetailMutationResult;
      if (name === 'schedules') return schedulesResult;
      return mutationResult;
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

  it('confirms medication deletion before mutating the prescription', async () => {
    mockUseCurrentProfessional.mockReturnValue({
      data: professional,
      isLoading: false,
    });
    mockHook.mockImplementation((name: string) => {
      if (name === 'prescription') return ownedPrescriptionResult;
      if (name === 'statuses') return statusesResult;
      if (name === 'medications') return medicationsResult;
      if (name === 'routes' || name === 'units') return emptyCatalogResult;
      if (name === 'deleteDetail') return deleteDetailMutationResult;
      if (name === 'schedules') return schedulesResult;
      return mutationResult;
    });

    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );

    await fireEvent.press(screen.getByLabelText('Eliminar medicamento detail-1'));

    expect(screen.getByText('Eliminar medicamento de la receta')).toBeTruthy();
    expect(mockDeleteDetail).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByLabelText('Confirmar eliminación de medicamento detail-1'),
    );

    expect(mockDeleteDetail).toHaveBeenCalledWith('detail-1');
  });

  function mockOwnedWithSchedules(schedules: typeof schedulesResult) {
    mockUseCurrentProfessional.mockReturnValue({ data: professional, isLoading: false });
    mockHook.mockImplementation((name: string) => {
      if (name === 'prescription') return ownedPrescriptionResult;
      if (name === 'statuses') return statusesResult;
      if (name === 'medications') return medicationsResult;
      if (name === 'routes' || name === 'units') return emptyCatalogResult;
      if (name === 'deleteDetail') return deleteDetailMutationResult;
      if (name === 'schedules') return schedules;
      if (name === 'createSchedule') return createScheduleMutationResult;
      if (name === 'deleteSchedule') return deleteScheduleMutationResult;
      return mutationResult;
    });
  }

  it('warns that the patient will not see the medication until a schedule exists', async () => {
    mockOwnedWithSchedules(schedulesResult);
    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );
    expect(
      screen.getByText(
        'Sin horarios: el paciente no verá este medicamento en su app hasta que se agregue al menos uno.',
      ),
    ).toBeTruthy();
  });

  it('rejects a malformed time before creating a schedule', async () => {
    mockOwnedWithSchedules(schedulesResult);
    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nueva hora de toma'), 'not-a-time');
    await fireEvent.press(screen.getByText('Agregar horario'));

    expect(screen.getByText('Usá el formato HH:MM, ej. 08:00')).toBeTruthy();
    expect(mockCreateSchedule).not.toHaveBeenCalled();
  });

  it('creates a schedule with seconds appended to the entered time', async () => {
    mockOwnedWithSchedules(schedulesResult);
    mockCreateSchedule.mockResolvedValue({ id: 'schedule-1' });
    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nueva hora de toma'), '08:00');
    await fireEvent.press(screen.getByText('Agregar horario'));

    expect(mockCreateSchedule).toHaveBeenCalledWith({ hora: '08:00:00' });
  });

  it('shows existing schedules and removes one without a confirmation step', async () => {
    mockOwnedWithSchedules(scheduleWithEntriesResult);
    const screen = await render(
      <PrescriptionDetailScreen patientId={101} prescriptionId="rx-1" recordId={7001} />,
    );

    expect(screen.getByText('08:00')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Eliminar horario 08:00'));
    expect(mockDeleteSchedule).toHaveBeenCalledWith('schedule-1');
  });
});
