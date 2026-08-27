import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

type CodeBoxesProps = {
  code?: string;
  groups?: number[];
};

export function CodeBoxes({ code = '', groups = [6] }: CodeBoxesProps) {
  let index = 0;

  return (
    <View style={styles.container}>
      {groups.map((groupSize, groupIndex) => (
        <View key={`${groupSize}-${groupIndex}`} style={styles.group}>
          {Array.from({ length: groupSize }).map((_, itemIndex) => {
            const digit = code[index] ?? '';
            const active = index === Math.min(code.length, groups.reduce((sum, size) => sum + size, 0) - 1);
            index += 1;
            return (
              <View
                key={`${groupIndex}-${itemIndex}`}
                style={[styles.box, active ? styles.activeBox : null]}
              >
                <Text style={styles.digit}>{digit}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  group: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  box: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 44,
  },
  activeBox: {
    borderColor: '#4675DD',
    shadowColor: '#2563EB',
    shadowOpacity: 0.45,
    shadowRadius: 4,
  },
  digit: {
    color: theme.color.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '800',
  },
});
