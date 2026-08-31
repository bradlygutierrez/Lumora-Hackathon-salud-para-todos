import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/src/shared/api/api-error';
import { MedicalRecordDocumentScreen } from '../screens/MedicalRecordDocumentScreen';

const mockUseAuthSession = jest.fn();
const mockUseMedicalRecordDocument = jest.fn();
const mockUseMedicalRecordDocumentPdf = jest.fn();
const mockDownloadPdf = jest.fn();
const mockSharePdf = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@/src/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));
jest.mock('../hooks/use-medical-record-document', () => ({
  useMedicalRecordDocument: () => mockUseMedicalRecordDocument(),
  useMedicalRecordDocumentPdf: () => mockUseMedicalRecordDocumentPdf(),
}));
jest.mock('../utils/medical-record-pdf', () => ({
  downloadMedicalRecordPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  shareMedicalRecordPdf: (...args: unknown[]) => mockSharePdf(...args),
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

const document = {
  generated_at: '2026-08-31T12:30:00Z',
  paciente: {
    id: 9,
    nombres: 'Ana',
    apellidos: 'Segura',
    fecha_nacimiento: '1988-06-14',
    sexo: { id: 2, nombre: 'Femenino' },
    tipo_sangre: { id: 3, nombre: 'O+' },
  },
  expediente: {
    id: 17,
    numero_expediente: 'EXP-B15-17',
    estado: { id: 1, nombre: 'Activo' },
    fecha_apertura: '2026-01-10T10:00:00Z',
  },
  antecedentes: [
    {
      id: 1,
      tipo: { id: 1, nombre: 'Familiar' },
      descripcion: 'Diabetes familiar',
      fecha: '2020-01-01',
    },
  ],
  alergias: [
    {
      id: 2,
      nombre: 'Penicilina',
      severidad: { id: 3, nombre: 'Alta' },
      estado: { id: 1, nombre: 'Activa' },
      observaciones: 'Evitar',
    },
  ],
  discapacidades: [
    {
      id: 3,
      nombre: 'Movilidad reducida',
      estado: { id: 1, nombre: 'Activa' },
      observaciones: null,
    },
  ],
  condiciones: [
    {
      id: 4,
      nombre: 'Hipertensión',
      descripcion: 'En seguimiento',
      estado: { id: 1, nombre: 'Activa' },
      diagnostico_id: 5,
      fecha_inicio: '2025-01-02',
      fecha_fin: null,
    },
  ],
  consultas: [
    {
      id: 31,
      fecha_consulta: '2026-08-24T15:30:00Z',
      motivo: 'Control',
      motivo_consulta: { id: 1, nombre: 'Control general' },
      sintomas: 'Sin síntomas agudos',
      evaluacion: 'Estable',
      indicaciones: 'Continuar tratamiento',
      observaciones: 'Seguimiento',
      profesional: {
        id: 8,
        nombre_completo: 'Dra. Álvarez',
        especialidad: 'Medicina familiar',
      },
      signos_vitales: [
        {
          id: 41,
          temperatura_c: 36.7,
          frecuencia_cardiaca: 72,
          frecuencia_respiratoria: 18,
          presion_sistolica: 120,
          presion_diastolica: 80,
          saturacion_oxigeno: 98,
          peso_kg: 74,
          talla_cm: 178,
          glucosa_mg_dl: 94,
          registrado_at: '2026-08-24T15:35:00Z',
        },
      ],
      diagnosticos: [
        {
          id: 5,
          descripcion: 'Hipertensión primaria',
          tipo: { id: 1, nombre: 'Confirmado' },
          es_principal: true,
          fecha_diagnostico: '2026-08-24',
          profesional: {
            id: 8,
            nombre_completo: 'Dra. Álvarez',
            especialidad: 'Medicina familiar',
          },
        },
      ],
    },
  ],
  recetas: [
    {
      id: 'rx-1',
      titulo: 'Tratamiento',
      estado: { id: 1, nombre: 'Emitida' },
      fecha_emision: '2026-08-24T15:45:00Z',
      vigencia_hasta: null,
      observaciones: null,
      consulta_id: 31,
      profesional: {
        id: 8,
        nombre_completo: 'Dra. Álvarez',
        especialidad: 'Medicina familiar',
      },
      detalles: [
        {
          id: 'rd-1',
          medicamento: {
            id: 'med-1',
            nombre: 'Metformina',
            nombre_generico: 'Metformina',
            presentacion: 'Tableta',
            concentracion: '500 mg',
          },
          dosis: '500 mg',
          frecuencia: 'Cada 12 horas',
          duracion_dias: 30,
          cantidad_total: 60,
          instrucciones: 'Con alimentos',
          unidad_medida: { id: 1, nombre: 'tabletas' },
          via_administracion: { id: 1, nombre: 'Oral' },
        },
      ],
    },
  ],
  indicadores: [
    {
      id: 'm-1',
      indicador_id: 'i-1',
      indicador_nombre: 'Glucosa',
      valor: 96,
      unidad_medida: { id: 2, nombre: 'mg/dL' },
      origen_registro: { id: 3, nombre: 'Manual' },
      fecha_medicion: '2026-08-29T12:00:00Z',
      observaciones: null,
    },
  ],
};

function defaults() {
  mockUseAuthSession.mockReturnValue({ permissions: new Set(['clinica:manage']) });
  mockUseMedicalRecordDocument.mockReturnValue({
    data: document,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  });
  mockUseMedicalRecordDocumentPdf.mockReturnValue({
    mutateAsync: mockMutateAsync,
  });
  mockMutateAsync.mockResolvedValue({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: 'lumora-expediente-9.pdf',
  });
  mockDownloadPdf.mockResolvedValue(undefined);
  mockSharePdf.mockResolvedValue(true);
}

describe('MedicalRecordDocumentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaults();
  });

  it('renders only the consolidated fields supplied by B15', async () => {
    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    expect(screen.getByText('Ana Segura')).toBeTruthy();
    expect(screen.getByText('EXP-B15-17')).toBeTruthy();
    expect(screen.getByText('Penicilina')).toBeTruthy();
    expect(screen.getByText('Hipertensión')).toBeTruthy();
    expect(screen.getByText('Control general')).toBeTruthy();
    expect(screen.getByText('Hipertensión primaria · Principal')).toBeTruthy();
    expect(screen.getAllByText('Metformina')).toHaveLength(2);
    expect(screen.getByText('96 mg/dL')).toBeTruthy();
  });

  it('keeps navigation to existing editable clinical sections', async () => {
    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Gestionar condiciones'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );

    await fireEvent.press(screen.getByLabelText('Ver consultas'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(staff)/patients/9/record/consultations?recordId=17',
    );

    await fireEvent.press(screen.getByLabelText('Ver historial de mediciones'));
    expect(mockPush).toHaveBeenCalledWith('/(staff)/patients/9/measurements');
  });

  it('downloads the PDF through the authenticated B15 request', async () => {
    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Descargar PDF del expediente'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockDownloadPdf).toHaveBeenCalledWith({
        bytes: expect.any(Uint8Array),
        filename: 'lumora-expediente-9.pdf',
      });
    });
  });

  it('shares the PDF only through the platform action', async () => {
    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    await fireEvent.press(screen.getByLabelText('Compartir o abrir PDF del expediente'));

    await waitFor(() => {
      expect(mockSharePdf).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Se abrió el menú para compartir el PDF.')).toBeTruthy();
    });
  });

  it('blocks direct access when the frontend permission is absent', async () => {
    mockUseAuthSession.mockReturnValue({ permissions: new Set() });

    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
  });

  it('renders backend 403 without leaving clinical data visible', async () => {
    mockUseMedicalRecordDocument.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('No permitido', 'forbidden', 403),
      refetch: mockRefetch,
    });

    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    expect(screen.getByText('Acceso denegado')).toBeTruthy();
    expect(screen.queryByText('Penicilina')).toBeNull();
  });

  it('keeps patient-scoped sections when B15 returns no formal record', async () => {
    mockUseMedicalRecordDocument.mockReturnValue({
      data: {
        ...document,
        expediente: null,
        antecedentes: [],
        condiciones: [],
        consultas: [],
        recetas: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const screen = await render(<MedicalRecordDocumentScreen patientId={9} />);

    expect(screen.getByText('Penicilina')).toBeTruthy();
    expect(screen.getByText('96 mg/dL')).toBeTruthy();
    expect(screen.getByText(/no reporta un expediente formal/i)).toBeTruthy();
    expect(screen.queryByLabelText('Gestionar condiciones')).toBeNull();
  });
});
