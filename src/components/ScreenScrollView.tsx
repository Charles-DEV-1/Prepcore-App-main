// Prepcore - UI Polish
import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

type ScreenScrollViewProps = ScrollViewProps & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function ScreenScrollView({ children, contentContainerStyle, ...props }: ScreenScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      bounces
      nestedScrollEnabled
      overScrollMode="never"
      removeClippedSubviews
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingBottom: 100 }, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
