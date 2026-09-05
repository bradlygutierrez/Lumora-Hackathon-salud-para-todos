import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../constants/theme';

export type ScreenTint = 'neutral' | 'patients' | 'agenda' | 'directory';

const TINT_BACKGROUND: Record<ScreenTint, string> = {
  neutral: theme.color.appBackground,
  patients: theme.color.patientsWash,
  agenda: theme.color.agendaWash,
  directory: theme.color.directoryWash,
};

type ScreenProps = PropsWithChildren<{
  /**
   * Lavado de fondo sutil para ayudar a ubicar en qué sección de la app
   * está el usuario -- Pacientes, Agenda y Personal tienen cada una su
   * propio matiz; todo lo demás usa "neutral" (el fondo de siempre).
   */
  tint?: ScreenTint;
}>;

export function Screen({ children, tint = 'neutral' }: ScreenProps) {
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: TINT_BACKGROUND[tint] }]}
      testID="screen-root"
    >
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
