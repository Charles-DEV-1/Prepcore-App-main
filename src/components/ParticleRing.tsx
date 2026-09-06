import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

type ParticleRingProps = {
  size?: number;
  count?: number;
  burstCount?: number;
  color?: string;
};

function Burst({ angle, radius, size, color, progress }: { angle: number; radius: number; size: number; color: string; progress: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const phase = (progress.value + angle / (Math.PI * 2)) % 1;
    const distance = interpolate(phase, [0, 0.14, 0.48, 1], [radius - 12, radius + 5, radius + 30, radius - 12]);
    return {
      opacity: interpolate(phase, [0, 0.1, 0.5, 0.82, 1], [0, 0.9, 0.45, 0, 0]),
      transform: [{ translateX: Math.cos(angle) * distance }, { translateY: Math.sin(angle) * distance }, { scale: interpolate(phase, [0, 0.35, 1], [0.6, 1, 0.5]) }],
    };
  });

  return <Animated.View style={[styles.burst, { top: radius, left: radius, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

export default function ParticleRing({ size = 260, count = 28, burstCount = 8, color = '#DDEEFF' }: ParticleRingProps) {
  const progress = useSharedValue(0);
  const radius = size / 2;
  const orbit = useMemo(() => Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return { key: `orbit-${index}`, x: radius + Math.cos(angle) * (radius - 12), y: radius + Math.sin(angle) * (radius - 12), r: index % 5 === 0 ? 3.5 : 2, opacity: index % 3 === 0 ? 0.95 : 0.5 };
  }), [count, radius]);
  const bursts = useMemo(() => Array.from({ length: burstCount }, (_, index) => ({ key: `burst-${index}`, angle: (index / burstCount) * Math.PI * 2, size: index % 3 === 0 ? 5 : 3 })), [burstCount]);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
  }, [progress]);

  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 360}deg` }] }));

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFillObject, orbitStyle]}>
        <Svg width={size} height={size}>
          {orbit.map(particle => <Circle key={particle.key} cx={particle.x} cy={particle.y} r={particle.r} fill={color} opacity={particle.opacity} />)}
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        {bursts.map(burst => <Burst key={burst.key} angle={burst.angle} radius={radius} size={burst.size} color={color} progress={progress} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute' },
});
