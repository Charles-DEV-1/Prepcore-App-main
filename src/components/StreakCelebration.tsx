import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

export function StreakCelebration({ streak, visible, onComplete }: { streak: number; visible: boolean; onComplete: () => void }) {
  const completeRef = useRef(onComplete);
  const backdrop = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.72);
  const flameScale = useSharedValue(0.2);

  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!visible) return;
    backdrop.value = 0;
    cardOpacity.value = 0;
    cardScale.value = 0.72;
    flameScale.value = 0.2;

    backdrop.value = withSequence(withTiming(0.76, { duration: 180 }), withDelay(2300, withTiming(0, { duration: 300 })));
    cardOpacity.value = withSequence(withTiming(1, { duration: 220 }), withDelay(2300, withTiming(0, { duration: 260 })));
    cardScale.value = withSequence(withSpring(1, { damping: 13, stiffness: 180 }), withDelay(2240, withTiming(0.9, { duration: 260, easing: Easing.in(Easing.cubic) })));
    flameScale.value = withSequence(withSpring(1.28, { damping: 10, stiffness: 210 }), withTiming(1, { duration: 260 }), withDelay(1900, withTiming(0.65, { duration: 300 })));

    const timer = setTimeout(() => completeRef.current(), 2900);
    return () => {
      clearTimeout(timer);
      cancelAnimation(backdrop);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(flameScale);
    };
  }, [backdrop, cardOpacity, cardScale, flameScale, streak, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ scale: cardScale.value }] }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flameScale.value }, { rotate: '-4deg' }] }));

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={() => completeRef.current()}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Animated.View style={[styles.flame, flameStyle]}><Ionicons name="flame" size={112} color="#FF8A1F" /></Animated.View>
          <Text style={styles.kicker}>STREAK LEVEL UP</Text>
          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.days}>day streak</Text>
          <Text style={styles.message}>You showed up again. Keep the fire alive.</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1020', padding: 24 },
  card: { width: '100%', maxWidth: 320, alignItems: 'center', borderRadius: 32, backgroundColor: '#18254A', borderWidth: 1, borderColor: 'rgba(255,176,72,0.7)', paddingHorizontal: 28, paddingVertical: 36 },
  flame: { height: 120, width: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 60, backgroundColor: 'rgba(255,135,30,0.18)' },
  kicker: { marginTop: 22, color: '#FFBD61', fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  count: { marginTop: 4, color: '#FFFFFF', fontSize: 80, fontWeight: '900', lineHeight: 92 },
  days: { color: '#D7E5FF', fontSize: 18, fontWeight: '700' },
  message: { marginTop: 18, color: '#AFC1E6', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
