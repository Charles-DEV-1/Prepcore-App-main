import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, shadow } from '../constants/theme';
import { usePrefersReducedMotion } from './AnimatedMotion';

export function OnboardingBrandHero({ step }: { step: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const pulse = useSharedValue(1);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      drift.value = 0;
      return;
    }

    pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })), -1, true);
    drift.value = withRepeat(withSequence(withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.ease) }), withTiming(5, { duration: 1800, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, [drift, pulse, reduceMotion]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drift.value }, { scale: pulse.value }] }));

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', height: 88, width: 88, borderRadius: 28, backgroundColor: colors.primary, ...shadow }, markStyle]}>
        <Text style={{ color: colors.white, fontSize: 52, fontWeight: '900', lineHeight: 60 }}>P</Text>
        <View style={{ position: 'absolute', bottom: 13, flexDirection: 'row', gap: 4 }}>
          <View style={{ height: 4, width: 16, borderRadius: 4, backgroundColor: '#B9D9FA' }} />
          <View style={{ height: 4, width: 10, borderRadius: 4, backgroundColor: colors.white }} />
        </View>
      </Animated.View>
      <Text style={{ marginTop: 14, color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: 0.2 }}>prepcore</Text>
      <Text style={{ marginTop: 4, color: colors.primary, fontSize: 13, fontWeight: '600' }}>Smart prep. Higher scores.</Text>
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {[0, 1, 2, 3].map(index => <View key={index} style={{ height: 5, width: index === step ? 24 : 7, borderRadius: 8, backgroundColor: index === step ? colors.primary : colors.primaryLight }} />)}
      </View>
    </View>
  );
}