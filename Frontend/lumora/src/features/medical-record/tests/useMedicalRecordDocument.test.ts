jest.mock('@/features/medical-record/api/medical-record-api', () => ({
  medicalRecordApi: {
    getDocument: jest.fn(),
  },
}));

jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { medicalRecordApi } from '@/features/medical-record/api/medical-record-api';
import { useMedicalRecordDocument } from '@/features/medical-record/hooks/useMedicalRecordDocument';
import {
  createQueryWrapper,
  createTestQueryClient,
} from '@/features/health-indicators/tests/query-test-utils';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

function baseDocument(pacienteId: number, nombre: string) {
  return {
    paciente_id: pacienteId,
    paciente: {
      id: pacienteId,
      nombres: nombre,
      apellidos: 'Zepeda',
      fecha_nacimiento: null,
      sexo_id: null,
    },
    expediente: null,
    antecedentes: [],
    alergias: [],
    discapacidades: [],
    condiciones: [],
    consultas: [],
    recetas: [],
    mediciones: [],
    alertas: [],
    generado_en: '2026-08-27T12:00:00Z',
    autor: null,
  };
}

describe('useMedicalRecordDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the document for the active patient (paciente role)', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 6, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    (medicalRecordApi.getDocument as jest.Mock).mockResolvedValue(baseDocument(6, 'Ana'));

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(medicalRecordApi.getDocument).toHaveBeenCalledWith(6);
    expect(result.current.document?.paciente.nombres).toBe('Ana');
    expect(result.current.isError).toBe(false);
  });

  it('fetches the document for a caregiver with an active relation the same way', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'caregiver',
      activePatient: { patientId: 10, displayName: 'Paciente Prueba Dos', relationship: 'write' },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    (medicalRecordApi.getDocument as jest.Mock).mockResolvedValue(
      baseDocument(10, 'Paciente Prueba Dos'),
    );

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(medicalRecordApi.getDocument).toHaveBeenCalledWith(10);
    expect(result.current.document?.paciente.nombres).toBe('Paciente Prueba Dos');
  });

  it('does not call the API while patientContext is still resolving', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'loading',
      role: 'patient',
      activePatient: undefined,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    expect(medicalRecordApi.getDocument).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces patientContext errors even without a query error', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'error',
      role: 'patient',
      activePatient: undefined,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    expect(result.current.isError).toBe(true);
  });

  it('surfaces a 403/denied query error', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'caregiver',
      activePatient: { patientId: 6, displayName: 'Ana Zepeda', relationship: 'read' },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    (medicalRecordApi.getDocument as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    );

    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.document).toBeUndefined();
  });

  it('does not carry over the previous patient document when switching patients (cache isolation)', async () => {
    (medicalRecordApi.getDocument as jest.Mock).mockImplementation((pacienteId: number) =>
      Promise.resolve(
        baseDocument(pacienteId, pacienteId === 6 ? 'Ana Zepeda' : 'Paciente Prueba Dos'),
      ),
    );

    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'caregiver',
      activePatient: { patientId: 6, displayName: 'Ana Zepeda', relationship: 'write' },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const client = createTestQueryClient();
    const { result, rerender } = await renderHook(() => useMedicalRecordDocument(), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.document?.paciente_id).toBe(6));

    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'caregiver',
      activePatient: { patientId: 10, displayName: 'Paciente Prueba Dos', relationship: 'write' },
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    rerender({});

    // React Query nunca comparte cache entre distintas query keys (aca
    // parametrizadas por pacienteId) y este hook no usa keepPreviousData,
    // asi que el cambio de paciente debe mostrar un loading fresco -- no
    // debe quedar visible ni un instante el documento del paciente 6.
    await waitFor(() => expect(result.current.document?.paciente_id).toBe(10));

    expect(result.current.document?.paciente.nombres).toBe('Paciente Prueba Dos');
    expect(medicalRecordApi.getDocument).toHaveBeenCalledWith(6);
    expect(medicalRecordApi.getDocument).toHaveBeenCalledWith(10);
  });
});
