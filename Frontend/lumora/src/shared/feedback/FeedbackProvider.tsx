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
type Feedback = { kind: FeedbackKind; message: string };
type FeedbackContextValue = {
  showFeedback: (message: string, kind?: FeedbackKind) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const showFeedback = useCallback((message: string, kind: FeedbackKind = 'info') => {
    setFeedback({ message, kind });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

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
        <View
          accessibilityRole={feedback.kind === 'error' ? 'alert' : 'summary'}
          accessibilityLiveRegion="polite"
          className="absolute inset-x-4 bottom-6 z-50 min-h-12 flex-row items-center gap-3 rounded-2xl bg-coal-900 px-4 py-3"
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
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider');
  return value;
}
