jest.mock('@/features/shell/hooks/useShellContext', () => ({
  useShellContext: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';

import { usePatientId } from '@/features/health-indicators/hooks/usePatientId';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

/**
 * `usePatientId` es el "patientContext" de A08: delega en el shell (B09,
 * mergeado en develop) para saber de qué paciente traer/guardar datos,
 * tanto si el usuario logueado ES el paciente como si es un cuidador que
 * seleccionó uno en /select-patient.
 */
describe('usePatientId (patientContext)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the pacienteId propio cuando el rol es Paciente', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'patient',
      activePatient: { patientId: 7, displayName: 'Ana Zepeda', relationship: null },
      availablePatients: [{ patientId: 7, displayName: 'Ana Zepeda', relationship: null }],
      switchPatient: jest.fn(),
    });

    const { result } = await renderHook(() => usePatientId());

    expect(result.current.pacienteId).toBe(7);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('resolves el paciente que un Cuidador seleccionó en /select-patient', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'ready',
      role: 'caregiver',
      activePatient: { patientId: 12, displayName: 'Juan Pérez', relationship: 'Padre' },
      availablePatients: [
        { patientId: 12, displayName: 'Juan Pérez', relationship: 'Padre' },
        { patientId: 15, displayName: 'María Pérez', relationship: 'Hermana' },
      ],
      switchPatient: jest.fn(),
    });

    const { result } = await renderHook(() => usePatientId());

    expect(result.current.pacienteId).toBe(12);
  });

  it('reports isLoading while the shell is resolving patientContext', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'loading',
      role: null,
      activePatient: null,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const { result } = await renderHook(() => usePatientId());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pacienteId).toBeUndefined();
  });

  it('reports isError when the shell failed to prepare patientContext', async () => {
    (useShellContext as jest.Mock).mockReturnValue({
      status: 'error',
      role: null,
      activePatient: null,
      availablePatients: [],
      switchPatient: jest.fn(),
    });

    const { result } = await renderHook(() => usePatientId());

    expect(result.current.isError).toBe(true);
    expect(result.current.pacienteId).toBeUndefined();
  });
});
