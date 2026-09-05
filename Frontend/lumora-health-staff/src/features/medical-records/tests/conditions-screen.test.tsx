import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ConditionsScreen } from '../screens/ConditionsScreen';

const mockUseAuthSession = jest.fn();
const mockUseConditions = jest.fn();
const mockUseConditionStatuses = jest.fn();
const mockUseDeleteCondition = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-structured-history', () => ({
  useConditions: (...args: unknown[]) => mockUseConditions(...args),
  useConditionStatuses: (...args: unknown[]) => mockUseConditionStatuses(...args),
  useDeleteCondition: (...args: unknown[]) => mockUseDeleteCondition(...args),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const condition = {
  id: 21,
  expediente_id: 7,
  paciente_id: 3,
  diagnostico_id: null,
  estado_condicion_id: 1,
  nombre: 'Hipertensión',
  descripcion: 'Seguimiento',
  fecha_inicio: '2026-08-01',
  fecha_fin: null,
  activo: true,
};

describe('ConditionsScreen J12', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseConditions.mockReturnValue({
      data: { items: [condition], total: 25, limit: 20, offset: 0 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseConditionStatuses.mockReturnValue({
      data: { items: [{ id: 1, nombre: 'Activa', activo: true }] },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseDeleteCondition.mockReturnValue({
      mutateAsync: mockDelete.mockResolvedValue(undefined),
      isPending: false,
      error: null,
    });
  });

  it('blocks direct access without clinica:manage and disables the query', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<ConditionsScreen patientId={3} recordId={7} />);

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(mockUseConditions).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ activo: true }),
      false,
    );
  });

  it('applies active filters and backend pagination', async () => {
    const screen = await render(<ConditionsScreen patientId={3} recordId={7} />);
    expect(mockUseConditions).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ activo: true, offset: 0, limit: 20 }),
      true,
    );

    await fireEvent.press(screen.getByText('Todos'));
    expect(mockUseConditions).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ activo: undefined, offset: 0 }),
      true,
    );

    await fireEvent.press(screen.getByText('Siguiente'));
    expect(mockUseConditions).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({ offset: 20 }),
      true,
    );
  });

  it('navigates to create, edit and condition history routes', async () => {
    const screen = await render(<ConditionsScreen patientId={3} recordId={7} />);

    await fireEvent.press(screen.getByLabelText('Añadir condición médica'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/3/record/conditions/new?recordId=7',
    );

    await fireEvent.press(screen.getByLabelText('Editar Hipertensión'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/3/record/conditions/21/edit?recordId=7',
    );

    await fireEvent.press(screen.getByLabelText('Ver historial de Hipertensión'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/3/record/conditions/21/history?recordId=7',
    );
  });

  it('requires confirmation before J04 soft delete', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await render(<ConditionsScreen patientId={3} recordId={7} />);

    await fireEvent.press(screen.getByLabelText('Eliminar Hipertensión'));
    expect(alert).toHaveBeenCalledWith(
      'Confirmar borrado lógico',
      expect.stringContaining('no se borra de forma permanente'),
      expect.any(Array),
    );

    const actions = alert.mock.calls[0][2] ?? [];
    const destructive = actions.find((action) => action.style === 'destructive');
    destructive?.onPress?.();
    expect(mockDelete).toHaveBeenCalledWith(21);
    alert.mockRestore();
  });
});
