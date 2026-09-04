import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  deleteProfileImage,
  getAccount,
  updateAccount,
  uploadProfileImage,
} from '../api/account.api';
import type { AccountUpdateRequest } from '../types/account.types';

export function useAccountProfile() {
  const queryClient = useQueryClient();
  const { reloadUser } = useAuthSession();

  const query = useQuery({
    queryKey: queryKeys.account.me,
    queryFn: getAccount,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.account.me });
    // El nombre/correo también viven en la sesión cacheada (se muestran en
    // el resto de la app, no solo en esta pantalla), así que hay que
    // refrescarla junto con la query de la cuenta.
    await reloadUser();
  };

  const update = useMutation({
    mutationFn: (data: AccountUpdateRequest) => updateAccount(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.account.me, profile);
      return reloadUser();
    },
  });

  const uploadImage = useMutation({
    mutationFn: (file: { uri: string; mimeType: string; fileName: string }) =>
      uploadProfileImage(file.uri, file.mimeType, file.fileName),
    onSuccess: refresh,
  });

  const deleteImage = useMutation({
    mutationFn: () => deleteProfileImage(),
    onSuccess: refresh,
  });

  return { ...query, update, uploadImage, deleteImage };
}
