import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sin esto, en formularios largos el teclado tapa el campo activo
          en vez de empujar el contenido: iOS no reduce la ventana solo,
          y en Android el resize automático no alcanza a compensar del
          todo con edge-to-edge habilitado. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.content}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.color.appBackground,
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 980,
    padding: theme.spacing.lg,
    width: '100%',
  },
});
