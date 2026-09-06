import type { QueryClient } from '@tanstack/react-query';

import { invalidateClinicalViews as invalidateConsultationViews } from '@/src/features/consultations/hooks/use-consultations';
import { invalidateDiagnosisViews } from '@/src/features/diagnoses/hooks/use-diagnoses';
import { invalidateClinicalViews as invalidateStructuredHistoryViews } from '@/src/features/medical-records/hooks/use-structured-history';
import { invalidatePrescriptionViews } from '@/src/features/prescriptions/hooks/use-prescriptions';
import { queryKeys } from '@/src/shared/api/query-keys';

function queryClientMock() {
  return {
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  } as unknown as QueryClient;
}

async function expectDocumentInvalidation(
  action: (client: QueryClient) => Promise<void>,
) {
  const client = queryClientMock();
  await action(client);
  expect(client.invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.clinical.medicalRecordDocument(9),
  });
}

describe('medical record document refresh after clinical mutations', () => {
  it('is included in consultation invalidation', async () => {
    await expectDocumentInvalidation((client) =>
      invalidateConsultationViews(client, {
        id: 31,
        expediente_id: 17,
        paciente_id: 9,
        profesional_id: 8,
        motivo_consulta_id: null,
        fecha_consulta: '2026-08-31T10:00:00Z',
        motivo: null,
        sintomas: null,
        evaluacion: null,
        indicaciones: null,
        observaciones: null,
        activo: true,
      }),
    );
  });

  it('is included in diagnosis invalidation', async () => {
    await expectDocumentInvalidation((client) =>
      invalidateDiagnosisViews(client, 9, 17),
    );
  });

  it('is included in prescription invalidation', async () => {
    await expectDocumentInvalidation((client) =>
      invalidatePrescriptionViews(client, 9, 17),
    );
  });

  it('is included in structured-history invalidation', async () => {
    await expectDocumentInvalidation((client) =>
      invalidateStructuredHistoryViews(client, 9, 17),
    );
  });
});
