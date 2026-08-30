import { Ionicons } from '@expo/vector-icons';
import {
  AccessibilityInfo,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type FeedbackKind = 'success' | 'error' | 'info';
// Por defecto el mensaje va pegado abajo (comportamiento original, usado
// en Editar perfil y Nuevo Recordatorio). Solo el tablero de Recordatorios
// (Posponer/Omitir) pide explícitamente 'center'.
type FeedbackPosition = 'bottom' | 'center';
type Feedback = { kind: FeedbackKind; message: string; position: FeedbackPosition };
type FeedbackContextValue = {
  showFeedback: (message: string, kind?: FeedbackKind, position?: FeedbackPosition) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const showFeedback = useCallback(
    (message: string, kind: FeedbackKind = 'info', position: FeedbackPosition = 'bottom') => {
      setFeedback({ message, kind, position });
      AccessibilityInfo.announceForAccessibility(message);
    },
    [],
  );

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4_000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const value = useMemo(() => ({ showFeedback }), [showFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {feedback ? (
        // pointerEvents="box-none" en el contenedor para que el área vacía
        // alrededor del mensaje siga dejando pasar los toques.
        <View
          pointerEvents="box-none"
          className={
            feedback.position === 'center'
              ? 'absolute inset-0 z-50 items-center justify-center px-4'
              : 'absolute inset-x-4 bottom-6 z-50'
          }
        >
          <View
            accessibilityRole={feedback.kind === 'error' ? 'alert' : 'summary'}
            accessibilityLiveRegion="polite"
            className="w-full min-h-12 flex-row items-center gap-3 rounded-2xl bg-coal-900 px-4 py-3"
          >
            <Ionicons
              name={feedback.kind === 'success' ? 'checkmark-circle' : feedback.kind === 'error' ? 'alert-circle' : 'information-circle'}
              size={20}
              color="#FFFFFF"
            />
            <Text className="flex-1 text-sm font-semibold text-white">{feedback.message}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar mensaje"
              hitSlop={12}
              onPress={() => setFeedback(null)}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider');
  return value;
}
