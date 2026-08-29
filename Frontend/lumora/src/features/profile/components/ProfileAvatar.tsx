import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { env } from '@/config/env';
import type { AccountProfile } from '@/features/profile/types/account.types';
import { profilePresenter } from '@/features/profile/utils/profile-presenter';

function imageUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(uri)) return uri;
  return `${env.apiUrl}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

export function ProfileAvatar({
  profile,
  size = 96,
  editable = false,
  onPress,
  previewUri,
}: {
  profile: AccountProfile;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
  previewUri?: string | null;
}) {
  const uri = imageUri(previewUri ?? profile.profile_image_url);
  const content = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View
      className="items-center justify-center rounded-full bg-lumen-300"
      style={{ width: size, height: size }}
    >
      <Text className="text-3xl font-bold text-coal-900">
        {profilePresenter.initials(profile)}
      </Text>
    </View>
  );

  return editable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cambiar foto de perfil"
      onPress={onPress}
      className="active:opacity-80"
    >
      {content}
    </Pressable>
  ) : content;
}
