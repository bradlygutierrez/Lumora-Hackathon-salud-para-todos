import { useQuery } from '@tanstack/react-query';

import { env } from '@/src/application/config/env';
import { queryKeys } from '@/src/shared/api/query-keys';
import { previewProfessionalsPage } from '@/src/shared/preview/health-staff-preview';
import { getProfessional, listProfessionals } from '../api/professionals.api';

export function useProfessionals() {
  return useQuery({
    queryKey: queryKeys.clinical.professionals.list({ limit: 50, offset: 0 }),
    queryFn: () =>
      env.enableUiPreview
        ? Promise.resolve(previewProfessionalsPage)
        : listProfessionals({ limit: 50, offset: 0 }),
  });
}

export function useProfessional(professionalId: number) {
  return useQuery({
    enabled: Number.isFinite(professionalId),
    queryKey: queryKeys.clinical.professionals.detail(professionalId),
    queryFn: () => {
      if (env.enableUiPreview) {
        const professional = previewProfessionalsPage.items.find(
          (item) => item.id === professionalId,
        );
        return professional
          ? Promise.resolve(professional)
          : Promise.reject(new Error('Profesional preview no encontrado'));
      }
      return getProfessional(professionalId);
    },
  });
}
