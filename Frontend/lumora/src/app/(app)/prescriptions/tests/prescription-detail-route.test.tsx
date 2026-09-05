import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const mockUseLocalSearchParams = jest.fn();
const mockUseRouter = jest.fn();
const mockUsePrescriptionDetail = jest.fn();
const mockUseSharePrescriptionPdf = jest.fn();
const mockShowFeedback = jest.fn();
const mockMutate = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => mockUseRouter(),
}));
jest.mock('@/features/prescriptions/hooks/usePrescriptionDetail', () => ({
  usePrescriptionDetail: (...args: unknown[]) => mockUsePrescriptionDetail(...args),
}));
jest.mock('@/features/prescriptions/hooks/usePrescriptionPdf', () => ({
  useSharePrescriptionPdf: () => mockUseSharePrescriptionPdf(),
}));
jest.mock('@/shared/feedback/FeedbackProvider', () => ({
  useFeedback: () => ({ showFeedback: mockShowFeedback }),
}));
jest.mock('@/features/prescriptions/components/PrescriptionSummaryCard', () => ({
  PrescriptionSummaryCard: () => null,
}));
jest.mock('@/features/prescriptions/components/PrescriptionMedicationItem', () => ({
  PrescriptionMedicationItem: () => null,
}));

import PrescriptionDetailRoute from '@/app/(app)/prescriptions/[recetaId]';
import { PrescriptionPdfUnavailableError } from '@/features/prescriptions/utils/prescription-pdf';

// Screen usa useQueryClient() para pull-to-refresh -- necesita un
// QueryClientProvider aunque esta pantalla no dispara queries propias.
function renderRoute(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PrescriptionDetailRoute PDF download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ recetaId: 'rx-1' });
    mockUseRouter.mockReturnValue({ back: jest.fn(), push: mockPush });
    mockUsePrescriptionDetail.mockReturnValue({
      receta: {
        id: 'rx-1',
        titulo: 'Tratamiento',
        fecha_emision: '2026-08-01T00:00:00Z',
        vigencia_hasta: null,
        observaciones: null,
      },
      detalles: [],
      doctorNombre: 'Dr. Ana Ríos',
      especialidad: 'Medicina interna',
      estadoNombre: 'Activa',
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseSharePrescriptionPdf.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('is no longer disabled and triggers the share mutation for this receta', async () => {
    const screen = await renderRoute(<PrescriptionDetailRoute />);

    const button = screen.getByLabelText('Descargar PDF');
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    await fireEvent.press(button);
    expect(mockMutate).toHaveBeenCalledWith('rx-1', expect.any(Object));
  });

  it('opens the medication schedule for this prescription', async () => {
    const screen = await renderRoute(<PrescriptionDetailRoute />);

    await fireEvent.press(screen.getByText('Ver horario de medicación'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/(tabs)/medication',
      params: { recetaId: 'rx-1' },
    });
  });

  it('shows the friendly error message when the PDF is unavailable', async () => {
    mockMutate.mockImplementation((_recetaId: string, options: { onError: (err: unknown) => void }) => {
      options.onError(new PrescriptionPdfUnavailableError('Tu sesion expiro.'));
    });

    const screen = await renderRoute(<PrescriptionDetailRoute />);
    await fireEvent.press(screen.getByLabelText('Descargar PDF'));

    expect(mockShowFeedback).toHaveBeenCalledWith('Tu sesion expiro.', 'error');
  });

  it('shows a generic error message for unexpected failures', async () => {
    mockMutate.mockImplementation((_recetaId: string, options: { onError: (err: unknown) => void }) => {
      options.onError(new Error('network down'));
    });

    const screen = await renderRoute(<PrescriptionDetailRoute />);
    await fireEvent.press(screen.getByLabelText('Descargar PDF'));

    expect(mockShowFeedback).toHaveBeenCalledWith(
      'No pudimos abrir la receta. Intenta de nuevo.',
      'error',
    );
  });

  it('shows a loading label while the PDF is being prepared', async () => {
    mockUseSharePrescriptionPdf.mockReturnValue({ mutate: mockMutate, isPending: true });
    const screen = await renderRoute(<PrescriptionDetailRoute />);
    const button = screen.getByLabelText('Preparando PDF…');
    expect(button.props.accessibilityState?.busy).toBe(true);
  });
});
