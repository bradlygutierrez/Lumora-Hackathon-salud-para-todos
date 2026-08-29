import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountApi } from '@/features/profile/api/account-api';
import type { AccountUpdateRequest } from '@/features/profile/types/account.types';

export const accountQueryKeys = {
  me: ['account', 'me'] as const,
};

export function useAccountProfile() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: accountQueryKeys.me,
    queryFn: () => accountApi.getMe(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.me });

  const update = useMutation({
    mutationFn: (data: AccountUpdateRequest) => accountApi.updateMe(data),
    onSuccess: (profile) => queryClient.setQueryData(accountQueryKeys.me, profile),
  });

  const uploadImage = useMutation({
    mutationFn: (file: { uri: string; mimeType: string; fileName: string }) =>
      accountApi.uploadProfileImage(file.uri, file.mimeType, file.fileName),
    onSuccess: refresh,
  });

  const deleteImage = useMutation({
    mutationFn: () => accountApi.deleteProfileImage(),
    onSuccess: refresh,
  });

  return { ...query, update, uploadImage, deleteImage };
}
