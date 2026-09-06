import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, type PressableProps, type StyleProp, type ViewStyle, StyleSheet, Pressable } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, withSequence } from 'react-native-reanimated';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduced(value);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (mounted) setReduced(value);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

type MotionContainerProps = {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  flashColor?: string;
};

export function MotionContainer({ children, delay = 0, distance = 16, duration = 420, style, disabled = false, flashColor }: MotionContainerProps) {
  const reduced = usePrefersReducedMotion();
  const opacity = useSharedValue(reduced || disabled ? 1 : 0);
  const translateY = useSharedValue(reduced || disabled ? 0 : distance);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (reduced || disabled) {
      opacity.value = 1;
      translateY.value = 0;
      flash.value = 0;
      return;
    }

    const config = { duration, easing: Easing.out(Easing.cubic) };
    opacity.value = withDelay(delay, withTiming(1, config));
    translateY.value = withDelay(delay, withTiming(0, config));
    if (flashColor) flash.value = withDelay(delay + 60, withSequence(withTiming(0.85, { duration: 300 }), withTiming(0, { duration: 500 })) as any);
  }, [delay, disabled, distance, duration, opacity, reduced, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
      {flashColor ? (
        <Animated.View pointerEvents="none" style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: flashColor, borderRadius: 8 }, flashStyle] as any} />
      ) : null}
    </Animated.View>
  );
}

type MotionPressableProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function MotionPressable({ children, style, contentStyle, disabled, onPressIn, onPressOut, ...props }: MotionPressableProps) {
  const reduced = usePrefersReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  const handlePressIn = (event: any) => {
    if (disabled || reduced) return;
    scale.value = withSpring(0.97, { damping: 18, stiffness: 260 });
    opacity.value = withTiming(0.95, { duration: 100 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (disabled || reduced) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 260 });
    opacity.value = withTiming(1, { duration: 120 });
    onPressOut?.(event);
  };

  return (
    <Animated.View style={[contentStyle, animatedStyle]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
