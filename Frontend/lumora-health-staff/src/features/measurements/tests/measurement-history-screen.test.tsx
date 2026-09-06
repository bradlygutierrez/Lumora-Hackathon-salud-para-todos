import { fireEvent, render } from '@testing-library/react-native';

import { MeasurementHistoryScreen } from '../screens/MeasurementHistoryScreen';

const mockUseAuthSession = jest.fn();
const mockMeasurements = jest.fn();
const mockCatalogs = jest.fn();
const mockBack = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-measurements', () => ({
  usePatientMeasurements: () => mockMeasurements(),
  useMeasurementCatalogs: () => mockCatalogs(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('MeasurementHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockMeasurements.mockReturnValue({
      data: [
        {
          id: 'm2',
          paciente_id: 9,
          indicador_id: 'i1',
          valor: 75,
          unidad_medida_id: 1,
          origen_registro_id: 2,
          registrado_por_id: 9,
          fecha_medicion: '2026-08-29T12:00:00Z',
          observaciones: null,
        },
        {
          id: 'm1',
          paciente_id: 9,
          indicador_id: 'i1',
          valor: 70,
          unidad_medida_id: 1,
          origen_registro_id: 2,
          registrado_por_id: 9,
          fecha_medicion: '2026-08-28T12:00:00Z',
          observaciones: null,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockCatalogs.mockReturnValue({
      indicators: { data: [{ id: 'i1', nombre: 'Pulso' }] },
      units: { data: { items: [{ id: 1, nombre: 'bpm' }] } },
      origins: { data: { items: [{ id: 2, nombre: 'Paciente' }] } },
    });
  });

  it('shows chronological values, origin and numeric trend', async () => {
    const screen = await render(
      <MeasurementHistoryScreen onBack={mockBack} patientId={9} />,
    );
    expect(screen.getByText('Historial de mediciones')).toBeTruthy();
    expect(screen.getAllByText('Pulso').length).toBeGreaterThan(0);
    expect(screen.getByText('+5.00')).toBeTruthy();
    expect(screen.getAllByText('Origen: Paciente').length).toBe(2);

    await fireEvent.press(screen.getByText('Volver'));
    expect(mockBack).toHaveBeenCalled();
  });
});
