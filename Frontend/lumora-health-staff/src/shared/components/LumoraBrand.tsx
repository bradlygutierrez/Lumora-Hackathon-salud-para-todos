import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

type LumoraBrandProps = {
  compact?: boolean;
  stacked?: boolean;
};

const lumoraLogoSvg = encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M31.6614 2C36.5866 2.00002 40.7336 6.207 40.7336 11.5908V21.9609C40.7337 23.0654 41.6291 23.9609 42.7336 23.9609H53.51C58.024 23.9609 61.8652 27.746 61.9963 32.6895C62.1329 37.8364 58.2033 41.9219 53.51 41.9219H30.4954C26.214 41.9216 22.5891 38.2606 22.5891 33.5508V11.5908C22.5891 6.20699 26.7361 2 31.6614 2Z" stroke="#85BCE3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2 31.2806C2 36.3211 6.19148 40.4837 11.4561 40.4837H21.7051C22.8096 40.4837 23.7051 41.3791 23.7051 42.4837V53.387C23.7051 58.01 27.4797 61.8651 32.3115 61.9964C37.3395 62.1327 41.4111 58.1942 41.4111 53.387V30.1019C41.4111 25.7126 37.7597 22.0785 33.1611 22.0784H11.4561C6.1916 22.0784 2.00019 26.2402 2 31.2806Z" stroke="#85BCE3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.017 29.3773C33.141 29.8383 33.2031 30.0688 33.3256 30.2572C33.4339 30.4238 33.5759 30.5659 33.7426 30.6742C33.9309 30.7967 34.1617 30.8588 34.6224 30.9828L38.3998 32.0004L34.6224 33.017C34.1616 33.141 33.9309 33.2032 33.7426 33.3256C33.576 33.4339 33.4339 33.576 33.3256 33.7426C33.2031 33.9309 33.141 34.1617 33.017 34.6225L32.0004 38.3998L30.9828 34.6225C30.8587 34.1617 30.7966 33.9309 30.6742 33.7426C30.5658 33.576 30.4238 33.4339 30.2572 33.3256C30.0688 33.2031 29.8382 33.1411 29.3773 33.017L25.6 32.0004L29.3773 30.9828C29.8382 30.8587 30.0688 30.7967 30.2572 30.6742C30.4238 30.5659 30.5658 30.4238 30.6742 30.2572C30.7966 30.0688 30.8587 29.8382 30.9828 29.3773L32.0004 25.6L33.017 29.3773Z" fill="#D5A53B" stroke="#D5A53B"/>
</svg>
`);

export function LumoraBrand({ compact = false, stacked = false }: LumoraBrandProps) {
  return (
    <View style={[styles.container, stacked ? styles.containerStacked : null]}>
      <Image
        accessibilityLabel="Lumora"
        source={{ uri: `data:image/svg+xml;utf8,${lumoraLogoSvg}` }}
        style={[
          styles.mark,
          compact ? styles.markCompact : null,
          stacked ? styles.markStacked : null,
        ]}
      />
      <Text
        style={[
          styles.word,
          compact ? styles.wordCompact : null,
          stacked ? styles.wordStacked : null,
        ]}
      >
        Lumora
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  containerStacked: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  mark: {
    height: 56,
    marginRight: theme.spacing.sm,
    width: 56,
  },
  markCompact: {
    height: 34,
    marginRight: theme.spacing.xs,
    width: 34,
  },
  markStacked: {
    marginRight: 0,
  },
  word: {
    color: theme.color.text,
    fontSize: 34,
    fontWeight: '900',
  },
  wordCompact: {
    fontSize: 28,
  },
  wordStacked: {
    fontSize: 38,
  },
});
