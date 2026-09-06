import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withRepeat, withSequence, Easing, useAnimatedStyle, interpolate } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
};

export function CircularScore({ percent, size = 288, strokeWidth = 10, color = '#E7F1FF', bgColor = '#0D1428' }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayValue, setDisplayValue] = useState(0);
  const progress = useSharedValue(0);
  const rotate = useSharedValue(0);
  const shine = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
    rotate.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, false);

    const duration = 900;
    const start = Date.now();
    const from = displayValue;
    const to = percent;
    let raf: number;

    const tick = () => {
      const now = Date.now();
      const progressValue = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progressValue < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value)
  }));

  const ringProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    fill: 'transparent'
  };

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
    opacity: interpolate(shine.value, [0, 1], [0.18, 1])
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: interpolate(pulse.value, [0, 1], [0.16, 0.52]), transform: [{ scale: interpolate(pulse.value, [0, 1], [0.86, 1.12]) }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotate.value * 360}deg` }] }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size * 0.7, height: size * 0.7, borderRadius: size, backgroundColor: color }, haloStyle]} />
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <Stop offset="45%" stopColor="rgba(255,255,255,0.6)" />
            <Stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </LinearGradient>
        </Defs>
        <G rotation="-90" originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={"rgba(255,255,255,0.06)"}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference}
            animatedProps={animatedProps}
            {...ringProps}
          />

          {/* placeholder for shiny ring */}
        </G>
      </Svg>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject as any, orbitStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius + 17} stroke="rgba(173,213,255,0.55)" strokeWidth={1} strokeDasharray="2 13" fill="transparent" />
          <Circle cx={size / 2} cy={size / 2} r={radius - 18} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="1 9" fill="transparent" />
        </Svg>
      </Animated.View>

      {/* rotating shiny overlay */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject as any, shineStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" originX={size / 2} originY={size / 2}>
            <Circle cx={size / 2} cy={size / 2} r={radius + strokeWidth / 2} stroke="url(#shineGrad)" strokeWidth={strokeWidth / 2} fill="transparent" />
          </G>
        </Svg>
      </Animated.View>

      <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 56, fontWeight: '800' }}>{displayValue}%</Text>
        <Text style={{ color: 'rgba(220,235,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>SCORE</Text>
      </View>
    </View>
  );
}

export default CircularScore;
