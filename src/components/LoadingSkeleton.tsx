// Prepcore — Live Data & Polish
import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';
import { colors, radii } from '../constants/theme';

type SkeletonProps = { width?: number | `${number}%`; height: number; borderRadius?: number; style?: ViewStyle };

export function LoadingSkeleton({ width = '100%', height, borderRadius = radii.medium, style }: SkeletonProps) {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <View style={[{ width, height, overflow: 'hidden', borderRadius, backgroundColor: colors.divider }, style]}>
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0, width: '55%', backgroundColor: colors.surfaceSecondary, opacity: 0.9,
          transform: [{ translateX: translateX.interpolate({ inputRange: [-1, 1], outputRange: [-160, 320] }) }]
        }}
      />
    </View>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: count }, (_, index) => <LoadingSkeleton key={index} height={112} />)}</View>;
}
