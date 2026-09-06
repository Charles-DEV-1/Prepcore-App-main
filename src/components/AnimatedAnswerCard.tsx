// Prepcore — Animated Answer Card
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, radii, shadow } from '../constants/theme';
import { space } from '../constants/spacing';

type AnimatedAnswerCardProps = {
  letter: string;
  text: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
  animationKey: string | number;
};

export function AnimatedAnswerCard({ letter, text, isSelected, onPress, index, animationKey }: AnimatedAnswerCardProps) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const entranceGradientOpacity = useRef(new Animated.Value(0)).current;
  const gradientId = `answer-entry-${String(animationKey).replace(/[^a-zA-Z0-9]/g, '')}-${letter}`;

  useEffect(() => {
    translateY.setValue(-30);
    opacity.setValue(0);
    glowOpacity.setValue(0);
    entranceGradientOpacity.setValue(0);
    const delay = index * 80;
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 380, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.48, duration: 450, delay: 100, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(entranceGradientOpacity, { toValue: 0.95, duration: 90, useNativeDriver: true }),
          Animated.delay(150),
          Animated.timing(entranceGradientOpacity, { toValue: 0, duration: 210, useNativeDriver: true }),
        ]),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [animationKey, entranceGradientOpacity, glowOpacity, index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], marginBottom: space.sm }}>
      <Animated.View pointerEvents="none" style={[styles.entranceGradient, { opacity: entranceGradientOpacity }]}>
        <Svg width="100%" height="100%"><Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2563EB" /><Stop offset="0.78" stopColor="#60A5FA" /><Stop offset="1" stopColor="#EC4899" /></LinearGradient></Defs><Rect width="100%" height="100%" rx="16" fill={`url(#${gradientId})`} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity, backgroundColor: isSelected ? '#0EA5E9' : '#14B8A6', shadowColor: isSelected ? '#0EA5E9' : '#14B8A6' }]} />
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, isSelected && styles.selected, pressed && styles.pressed]}>
        <View style={[styles.badge, isSelected && styles.badgeSelected]}><Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{letter}</Text></View>
        <Text style={styles.optionText}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entranceGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: 'hidden', transform: [{ scale: 1.025 }] },
  glow: { position: 'absolute', top: 8, left: 10, right: 10, bottom: -5, borderRadius: radii.lg, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.58, shadowRadius: 16, elevation: 8 },
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.88 },
  badge: { height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.primarySoft },
  badgeSelected: { backgroundColor: colors.primary },
  badgeText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  badgeTextSelected: { color: colors.white },
  optionText: { marginLeft: space.md, flex: 1, color: colors.text, fontSize: 15 },
});
