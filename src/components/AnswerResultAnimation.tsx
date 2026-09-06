import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export function AnswerResultAnimation({ correct }: { correct: boolean }) {
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.82);
    opacity.setValue(0);
    shake.setValue(0);
    const entrance = Animated.parallel([
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    const animation = correct ? entrance : Animated.sequence([
      entrance,
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [correct, opacity, scale, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 4] });
  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }] }}>
      <View style={{ height: 42, width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: correct ? colors.success : colors.danger }}>
        <Ionicons name={correct ? 'checkmark' : 'close'} size={24} color={colors.white} />
      </View>
    </Animated.View>
  );
}
