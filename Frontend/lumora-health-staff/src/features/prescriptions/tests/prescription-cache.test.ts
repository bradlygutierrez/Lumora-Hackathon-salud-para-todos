import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/src/shared/api/query-keys';
import {
  invalidatePrescriptionViews,
  prescriptionKeys,
} from '../hooks/use-prescriptions';

describe('prescription cache invalidation J13', () => {
  it('refreshes prescriptions, patient summaries and record timeline after mutations', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await invalidatePrescriptionViews(queryClient, 101, 7001);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: prescriptionKeys.patient(101),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.clinical.patientSummary(101),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(101),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.clinical.medicalRecordTimeline(7001),
    });
  });
});
