import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { DiagnosesScreen } from '../screens/DiagnosesScreen';

const mockUseAuthSession = jest.fn();
const mockUseDiagnoses = jest.fn();
const mockUseDiagnosisTypes = jest.fn();
const mockUseCreateDiagnosis = jest.fn();
const mockUseUpdateDiagnosis = jest.fn();
const mockUseDeleteDiagnosis = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-diagnoses', () => ({
  useDiagnoses: (...args: unknown[]) => mockUseDiagnoses(...args),
  useDiagnosisTypes: (...args: unknown[]) => mockUseDiagnosisTypes(...args),
  useCreateDiagnosis: (...args: unknown[]) => mockUseCreateDiagnosis(...args),
  useUpdateDiagnosis: (...args: unknown[]) => mockUseUpdateDiagnosis(...args),
  useDeleteDiagnosis: (...args: unknown[]) => mockUseDeleteDiagnosis(...args),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
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

const diagnosis = {
  id: 31,
  consulta_id: 3401,
  expediente_id: 7001,
  profesional_id: 101,
  tipo_diagnostico_id: 2,
  descripcion: 'Hipertensión arterial primaria',
  es_principal: true,
  fecha_diagnostico: '2026-08-24',
  activo: true,
};

describe('DiagnosesScreen J13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ ...diagnosis, id: 32 });
    mockUpdate.mockResolvedValue(diagnosis);
    mockDelete.mockResolvedValue(undefined);
    mockUseAuthSession.mockReturnValue({
      permissions: new Set(['clinica:manage']),
    });
    mockUseDiagnoses.mockReturnValue({
      data: { items: [diagnosis], total: 1, limit: 20, offset: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseDiagnosisTypes.mockReturnValue({
      data: {
        items: [{ id: 2, nombre: 'Confirmado', activo: true }],
        total: 1,
        limit: 100,
        offset: 0,
      },
      isLoading: false,
      isError: false,
    });
    mockUseCreateDiagnosis.mockReturnValue({
      mutateAsync: mockCreate,
      isPending: false,
      error: null,
    });
    mockUseUpdateDiagnosis.mockReturnValue({
      mutateAsync: mockUpdate,
      isPending: false,
      error: null,
    });
    mockUseDeleteDiagnosis.mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
      error: null,
    });
  });

  it('blocks direct access without clinica:manage and disables diagnosis queries', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(
      <DiagnosesScreen consultationId={3401} patientId={101} recordId={7001} />,
    );

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(mockUseDiagnoses).toHaveBeenCalledWith(
      101,
      7001,
      3401,
      expect.any(Object),
      false,
    );
    expect(mockUseDiagnosisTypes).toHaveBeenCalledWith(false);
  });

  it('navigates from a diagnosis to a linked condition create flow', async () => {
    const screen = await render(
      <DiagnosesScreen consultationId={3401} patientId={101} recordId={7001} />,
    );

    await fireEvent.press(
      screen.getByLabelText('Crear condición desde diagnóstico 31'),
    );

    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/101/record/conditions/new?recordId=7001&diagnosisId=31',
    );
  });

  it('creates a diagnosis using the real catalog selection', async () => {
    const screen = await render(
      <DiagnosesScreen consultationId={3401} patientId={101} recordId={7001} />,
    );

    await fireEvent.press(screen.getByText('Confirmado'));
    fireEvent.changeText(
      screen.getByLabelText('Descripción del diagnóstico'),
      'Diabetes mellitus tipo 2',
    );
    await fireEvent.press(screen.getByText('Guardar diagnóstico'));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_diagnostico_id: 2,
        descripcion: 'Diabetes mellitus tipo 2',
        es_principal: false,
        activo: true,
      }),
    );
  });

  it('requires confirmation before soft deleting a diagnosis', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await render(
      <DiagnosesScreen consultationId={3401} patientId={101} recordId={7001} />,
    );

    await fireEvent.press(screen.getByLabelText('Eliminar diagnóstico 31'));
    expect(alert).toHaveBeenCalledWith(
      'Eliminar diagnóstico',
      expect.stringContaining('borrado lógico'),
      expect.any(Array),
    );

    const actions = alert.mock.calls[0][2] ?? [];
    actions.find((action) => action.style === 'destructive')?.onPress?.();
    expect(mockDelete).toHaveBeenCalledWith(31);
    alert.mockRestore();
  });
});
