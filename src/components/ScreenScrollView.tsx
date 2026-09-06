// Prepcore - UI Polish
import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenScrollViewProps = ScrollViewProps & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

function extractBackgroundColor(style?: StyleProp<ViewStyle>) {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    for (const item of style) {
      if (item && typeof item === 'object' && 'backgroundColor' in item) {
        return (item as ViewStyle).backgroundColor;
      }
    }
    return undefined;
  }
  if (typeof style === 'object' && 'backgroundColor' in style) {
    return (style as ViewStyle).backgroundColor;
  }
  return undefined;
}

export function ScreenScrollView({ children, contentContainerStyle, style, ...props }: ScreenScrollViewProps) {
  const backgroundColor = extractBackgroundColor(style);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces
        nestedScrollEnabled
        overScrollMode="never"
        removeClippedSubviews
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={style}
        contentContainerStyle={[{ paddingBottom: 100 }, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
