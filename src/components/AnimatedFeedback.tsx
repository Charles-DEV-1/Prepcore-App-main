import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow } from '../constants/theme';
import { space } from '../constants/spacing';

export type FeedbackKind = 'success' | 'error' | 'info' | 'warning';
type FeedbackPosition = 'top' | 'bottom' | 'center';
type Feedback = { message: string; kind: FeedbackKind; position: FeedbackPosition };
type FeedbackContextValue = { showFeedback: (message: string, kind?: FeedbackKind, position?: FeedbackPosition) => void };

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const palette: Record<FeedbackKind, { background: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { background: '#0F766E', icon: 'checkmark-circle' },
  error: { background: colors.danger, icon: 'alert-circle' },
  info: { background: colors.primary, icon: 'information-circle' },
  warning: { background: '#B45309', icon: 'warning' },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setFeedback(null);
    });
  }, [opacity]);

  const showFeedback = useCallback((message: string, kind: FeedbackKind = 'info', position: FeedbackPosition = kind === 'success' ? 'bottom' : 'top') => {
    if (timer.current) clearTimeout(timer.current);
    setFeedback({ message, kind, position });
    progress.setValue(0);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(progress, { toValue: 1, speed: 18, bounciness: 7, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(dismiss, 3400);
  }, [dismiss, opacity, progress]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const translateY = feedback?.position === 'bottom' ? progress.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) : progress.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const color = feedback ? palette[feedback.kind] : palette.info;
  const positionStyle = feedback?.position === 'bottom' ? { bottom: 34 } : feedback?.position === 'center' ? { top: '45%' as const } : { top: 52 };

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      {feedback ? (
        <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: space.medium, right: space.medium, zIndex: 100, opacity, transform: [{ translateY }, { scale }] }, positionStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, padding: space.md, backgroundColor: color.background, ...shadow }}>
            <Ionicons name={color.icon} size={22} color={colors.white} />
            <Text style={{ flex: 1, marginLeft: space.sm, color: colors.white, fontSize: 14, fontWeight: '700' }}>{feedback.message}</Text>
            <Pressable onPress={dismiss} hitSlop={8}><Ionicons name="close" size={19} color={colors.white} /></Pressable>
          </View>
        </Animated.View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useAppFeedback must be used inside FeedbackProvider');
  return context;
}
