import { fireEvent, render } from '@testing-library/react-native';

import { MedicalTimelineScreen } from '../screens/MedicalTimelineScreen';

const mockUseMedicalRecordTimeline = jest.fn();
const mockUseAuthSession = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFetchNextPage = jest.fn();

jest.mock('../hooks/use-medical-record', () => ({
  useMedicalRecordTimeline: (...args: unknown[]) => mockUseMedicalRecordTimeline(...args),
}));

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
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

const pages = [
  {
    items: [
      {
        occurred_at: '2026-08-24T15:40:00Z',
        tipo: 'diagnostico',
        titulo: 'Diagnóstico',
        detalle: 'Hipertensión primaria',
        entidad: 'diagnosticos',
        entidad_id: '4',
      },
      {
        occurred_at: '2026-08-24T15:45:00Z',
        tipo: 'receta',
        titulo: 'Receta emitida',
        detalle: 'Control antihipertensivo',
        entidad: 'recetas',
        entidad_id: 'rx-1',
      },
    ],
    total: 3,
    limit: 2,
    offset: 0,
  },
];

describe('MedicalTimelineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
    mockUseMedicalRecordTimeline.mockReturnValue({
      data: { pages },
      isLoading: false,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });
  });

  it('renders chronological clinical events from the paginated endpoint', async () => {
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    expect(screen.getByText('Hipertensión primaria')).toBeTruthy();
    expect(screen.getByText('Control antihipertensivo')).toBeTruthy();
  });

  it('filters the timeline by backend event type', async () => {
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    await fireEvent.press(screen.getByLabelText('Filtrar timeline por Diagnósticos'));
    expect(mockUseMedicalRecordTimeline).toHaveBeenLastCalledWith(17, {
      limit: 10,
      tipo: 'diagnostico',
    });
  });

  it('navigates a diagnosis event to the diagnosis section of the record', async () => {
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    await fireEvent.press(screen.getByLabelText('Abrir evento Diagnóstico'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record?section=diagnosticos',
    );
  });

  it('routes J12 condition and medical-history timeline events to their real management screens', async () => {
    mockUseMedicalRecordTimeline.mockReturnValue({
      data: {
        pages: [{
          items: [
            { occurred_at: '2026-08-24T15:30:00Z', tipo: 'condicion', titulo: 'Hipertensión', detalle: null, entidad: 'condiciones_medicas', entidad_id: '31' },
            { occurred_at: '2026-08-24T15:31:00Z', tipo: 'historial_condicion', titulo: 'CAMBIO_ESTADO', detalle: 'Seguimiento', entidad: 'historial_condiciones', entidad_id: '32' },
            { occurred_at: '2026-08-24T15:32:00Z', tipo: 'antecedente', titulo: 'Antecedente médico', detalle: 'Familiar', entidad: 'antecedentes_medicos', entidad_id: '33' },
          ],
          total: 3, limit: 10, offset: 0,
        }],
      },
      isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: mockFetchNextPage,
    });
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);

    await fireEvent.press(screen.getByLabelText('Abrir evento Hipertensión'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/conditions?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir evento CAMBIO_ESTADO'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/conditions?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir evento Antecedente médico'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/history?recordId=17');
  });


  it('navigates consultation events directly and child clinical events to consultation history', async () => {
    mockUseMedicalRecordTimeline.mockReturnValue({
      data: {
        pages: [{
          items: [
            { occurred_at: '2026-08-24T15:30:00Z', tipo: 'consulta', titulo: 'Control', detalle: null, entidad: 'consultas_medicas', entidad_id: '51' },
            { occurred_at: '2026-08-24T15:35:00Z', tipo: 'signos_vitales', titulo: 'Signos vitales registrados', detalle: null, entidad: 'signos_vitales', entidad_id: '71' },
            { occurred_at: '2026-08-24T15:40:00Z', tipo: 'nota', titulo: 'Nota clínica', detalle: 'Seguimiento', entidad: 'notas_clinicas', entidad_id: '81' },
          ],
          total: 3, limit: 10, offset: 0,
        }],
      },
      isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: mockFetchNextPage,
    });
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);

    await fireEvent.press(screen.getByLabelText('Abrir evento Control'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/consultations/51');

    await fireEvent.press(screen.getByLabelText('Abrir evento Signos vitales registrados'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/consultations?recordId=17');

    await fireEvent.press(screen.getByLabelText('Abrir evento Nota clínica'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/record/consultations?recordId=17');
  });

  it('offers backend filters for consultation notes and vital signs', async () => {
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    await fireEvent.press(screen.getByLabelText('Filtrar timeline por Signos vitales'));
    expect(mockUseMedicalRecordTimeline).toHaveBeenLastCalledWith(17, { limit: 10, tipo: 'signos_vitales' });
    await fireEvent.press(screen.getByLabelText('Filtrar timeline por Notas'));
    expect(mockUseMedicalRecordTimeline).toHaveBeenLastCalledWith(17, { limit: 10, tipo: 'nota' });
  });

  it('loads the next backend page when more events exist', async () => {
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    await fireEvent.press(screen.getByLabelText('Cargar más eventos clínicos'));
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('blocks users without clinical permission', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });
    const screen = await render(<MedicalTimelineScreen patientId={9} recordId={17} />);
    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });
});
