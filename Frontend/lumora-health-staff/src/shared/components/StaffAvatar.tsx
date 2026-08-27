import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

type StaffAvatarProps = {
  firstName?: string;
  lastName?: string;
  size?: number;
};

export function StaffAvatar({ firstName = 'S', lastName = 'P', size = 64 }: StaffAvatarProps) {
  return (
    <View style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.initials, { fontSize: Math.max(16, size / 3) }]}>
        {firstName.slice(0, 1)}
        {lastName.slice(0, 1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.softBorder,
    borderWidth: 1,
    justifyContent: 'center',
  },
  initials: {
    color: theme.color.text,
    fontWeight: '900',
  },
});
