import {
  Image,
} from 'expo-image';

import {
  Text,
  View,
} from 'react-native';

import type {
  AppointmentProfessionalSummary,
} from '@/features/appointments/types/appointments.types';
import {
  resolveMediaUrl,
} from '@/features/appointments/utils/appointments';

export function ProfessionalAvatar({
  professional,
  size = 58,
}: {
  professional:
    AppointmentProfessionalSummary;
  size?: number;
}) {
  const uri =
    resolveMediaUrl(
      professional
        .profile_image_url,
    );

  if (uri) {
    return (
      <Image
        source={{
          uri,
        }}
        contentFit="cover"
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
        }}
      />
    );
  }

  const initials =
    professional.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(
        0,
        2,
      )
      .map(
        (part) =>
          part[0]?.toUpperCase() ??
          '',
      )
      .join('');

  return (
    <View
      className="items-center justify-center bg-[#E6F2F3]"
      style={{
        width: size,
        height: size,
        borderRadius:
          size / 2,
      }}
    >
      <Text className="text-lg font-bold text-[#007B7F]">
        {initials || 'DR'}
      </Text>
    </View>
  );
}
