jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';

const { httpClient: mockHttpClient } = jest.requireMock(
  '@/shared/api/http-client',
) as { httpClient: { get: jest.Mock; post: jest.Mock } };

describe('SchedulesApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.post.mockReset();
  });

  it('lists horarios for a detalle_receta', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await schedulesApi.getHorarios('detalle-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/recetas/detalle-1/horarios');
  });

  it('lists dosis logs for a horario', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await schedulesApi.getDosisLogs('horario-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/horarios/horario-1/dosis');
  });

  it('registers a dose without sending responsable_id (the backend forces it)', async () => {
    mockHttpClient.post.mockResolvedValue({ id: 'dosis-1' });

    await schedulesApi.registerDose('horario-1', {
      estado_dosis_id: 1,
      origen_registro_id: 1,
      fecha_programada: '2026-08-28T08:00:00.000Z',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/horarios/horario-1/dosis', {
      estado_dosis_id: 1,
      origen_registro_id: 1,
      fecha_programada: '2026-08-28T08:00:00.000Z',
    });

    const [, body] = mockHttpClient.post.mock.calls[0];
    expect(body).not.toHaveProperty('responsable_id');
  });
});
