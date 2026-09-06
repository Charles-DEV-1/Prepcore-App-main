import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, radii } from '../constants/theme';
import { space } from '../constants/spacing';
import { usePrefersReducedMotion } from './AnimatedMotion';

export function ExplanationReveal({ text, revealKey }: { text: string; revealKey: string }) {
  const reduced = usePrefersReducedMotion();
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [height, setHeight] = useState(0);
  const sweep = useRef(new Animated.Value(-1)).current;
  const gradientId = `explanation-sweep-${revealKey.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    let mounted = true;
    setVisibleCharacters(reduced ? text.length : 0);
    sweep.stopAnimation();
    sweep.setValue(-1);
    if (reduced || !text) return () => { mounted = false; };

    const duration = Math.min(2600, Math.max(850, text.length * 16));
    const intervalMs = 24;
    const charactersPerTick = Math.max(1, Math.ceil(text.length / (duration / intervalMs)));
    const timer = setInterval(() => {
      if (!mounted) return;
      setVisibleCharacters(current => Math.min(text.length, current + charactersPerTick));
    }, intervalMs);
    const shimmer = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    shimmer.start();
    const completionTimer = setTimeout(() => {
      clearInterval(timer);
      shimmer.stop();
      if (mounted) setVisibleCharacters(text.length);
    }, duration + intervalMs);
    return () => {
      mounted = false;
      clearInterval(timer);
      clearTimeout(completionTimer);
      shimmer.stop();
    };
  }, [reduced, revealKey, sweep, text]);

  const isRevealing = visibleCharacters < text.length;
  const sweepY = sweep.interpolate({ inputRange: [-1, 1], outputRange: [-Math.max(height, 220), Math.max(height, 220)] });

  return (
    <View style={styles.container} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      <Text style={styles.text}>{text.slice(0, visibleCharacters)}</Text>
      {isRevealing ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, { opacity: 0.82, transform: [{ translateY: sweepY }] }]}>
          <Svg width="100%" height="100%"><Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#185FA5" stopOpacity="0" /><Stop offset="0.5" stopColor="#60A5FA" stopOpacity="0.95" /><Stop offset="1" stopColor="#EC4899" stopOpacity="0" /></LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#${gradientId})`} /></Svg>
        </Animated.View>
      ) : null}
      {isRevealing ? <View pointerEvents="none" style={styles.revealDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden', borderRadius: radii.medium, backgroundColor: colors.primarySoft, padding: space.md },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  sweep: { position: 'absolute', top: -90, left: 0, right: 0, height: 180 },
  revealDot: { position: 'absolute', right: 10, top: 14, height: 7, width: 7, borderRadius: 999, backgroundColor: '#EC4899', shadowColor: '#EC4899', shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
});
