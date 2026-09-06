import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Slice = { label: string; value: number; color: string };

function DonutSlice({ slice, index, total, offset, circumference, center, radius, strokeWidth }: { slice: Slice; index: number; total: number; offset: number; circumference: number; center: number; radius: number; strokeWidth: number }) {
  const progress = useSharedValue(0);
  const length = (slice.value / total) * circumference;

  useEffect(() => {
    progress.value = withDelay(160 + index * 130, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [index, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: -offset + length * (1 - progress.value) }));

  return <AnimatedCircle cx={center} cy={center} r={radius} stroke={slice.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${Math.max(length - 4, 0)} ${circumference}`} fill="transparent" animatedProps={animatedProps} />;
}

export function PieChart({ slices, size = 136, strokeWidth = 24 }: { slices: Slice[]; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#EAF2FF" strokeWidth={strokeWidth} fill="transparent" />
          {slices.map((slice, index) => {
            const itemOffset = offset;
            offset += (slice.value / total) * circumference;
            return <DonutSlice key={slice.label} slice={slice} index={index} total={total} offset={itemOffset} circumference={circumference} center={size / 2} radius={radius} strokeWidth={strokeWidth} />;
          })}
        </G>
      </Svg>
    </View>
  );
}

export default PieChart;
