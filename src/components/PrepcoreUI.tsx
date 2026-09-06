// Prepcore - UI Polish
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type PressableProps, type TextInputProps, type ViewStyle } from 'react-native';
import { MotionContainer, MotionPressable } from './AnimatedMotion';
import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, shadow } from '../constants/theme';
import { polishedCard, space } from '../constants/spacing';

type ButtonProps = PressableProps & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
};

export function BrandMark({ size = 48, showName = false, dark = false }: { size?: number; showName?: boolean; dark?: boolean }) {
  return (
    <View className="flex-row items-center justify-center">
      <View
        className="items-center justify-center"
        style={{
          height: size,
          width: size,
          borderRadius: size * 0.24,
          backgroundColor: colors.primary,
          ...shadow
        }}
      >
        <Text style={{ color: colors.white, fontSize: size * 0.58, fontWeight: '900', lineHeight: size * 0.72 }}>P</Text>
      </View>
      {showName ? (
        <Text className="ml-3" style={{ color: dark ? colors.white : colors.text, fontSize: Math.max(14, size * 0.34), fontWeight: '700' }}>
          prepcore
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: ViewStyle }) {
  return (
    <MotionContainer delay={40} distance={10} style={[{ width: '100%' }]}>
      <View className={`bg-white ${className}`} style={[polishedCard, { borderWidth: 1, borderColor: colors.softLine }, style]}>
        {children}
      </View>
    </MotionContainer>
  );
}

export function AppTextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[
        {
          minHeight: 48,
          borderRadius: radii.large,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: space.lg,
          color: colors.text,
          fontSize: 15,
          paddingVertical: space.sm
        },
        style
      ]}
      placeholderTextColor={props.placeholderTextColor ?? colors.muted}
    />
  );
}

export function IconButton({ icon, onPress, size = 44, tint = colors.primary }: { icon: ReactNode; onPress?: () => void; size?: number; tint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: size,
        width: size,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.softLine
      }}
    >
      <View>{icon}</View>
    </Pressable>
  );
}

export function ActionButton({ children, variant = 'primary', disabled, className = '', ...props }: ButtonProps & { className?: string }) {
  const palette = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.white },
    secondary: { bg: colors.primarySoft, border: colors.primaryLight, text: colors.primary },
    outline: { bg: colors.white, border: colors.border, text: colors.text },
    danger: { bg: colors.danger, border: colors.danger, text: colors.white },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.primary }
  }[variant];

  return (
    <MotionPressable
      disabled={disabled}
      className={`items-center justify-center ${className}`}
      style={{
        minHeight: 48,
        paddingHorizontal: space.xl,
        paddingVertical: space.md,
        borderRadius: radii.large,
        backgroundColor: disabled ? colors.divider : palette.bg,
        borderWidth: variant === 'primary' || variant === 'danger' ? 0 : 1,
        borderColor: disabled ? colors.divider : palette.border,
        opacity: disabled ? 0.7 : 1
      }}
      contentStyle={{ width: '100%' }}
      {...props}
    >
      <Text style={{ color: disabled ? colors.white : palette.text, fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
        {children}
      </Text>
    </MotionPressable>
  );
}

export function StepDots({ total, active }: { total: number; active: number }) {
  return (
    <View className="flex-row items-center justify-center">
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} className="flex-row items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{
              height: 34,
              width: 34,
              backgroundColor: index === active ? colors.primary : colors.divider
            }}
          >
            <Text style={{ color: index === active ? colors.white : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>
              {index + 1}
            </Text>
          </View>
          {index < total - 1 ? <View className="mx-2 h-1 w-5 rounded-full" style={{ backgroundColor: colors.divider }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function PillTabs({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View className="flex-row" style={{ backgroundColor: colors.surfaceSecondary, borderRadius: radii.large, padding: 4 }}>
      {options.map(option => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className="flex-1 items-center justify-center"
            style={{ borderRadius: radii.medium, backgroundColor: selected ? colors.white : 'transparent', minHeight: 40, paddingHorizontal: space.sm }}
          >
            <Text style={{ color: selected ? colors.primary : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const subjectIconMap: Record<string, { lib: 'fa' | 'mc' | 'ion' | 'ad'; name: string }> = {
  English: { lib: 'ion', name: 'book-outline' },
  'English Language': { lib: 'ion', name: 'book-outline' },
  Mathematics: { lib: 'fa', name: 'drafting-compass' },
  Physics: { lib: 'mc', name: 'atom' },
  Chemistry: { lib: 'mc', name: 'flask-outline' },
  Biology: { lib: 'mc', name: 'microscope' },
  Economics: { lib: 'fa', name: 'dollar-sign' },
  Government: { lib: 'mc', name: 'bank-outline' },
  Literature: { lib: 'mc', name: 'feather' },
  CRS: { lib: 'fa', name: 'cross' },
  Geography: { lib: 'mc', name: 'earth' },
  Account: { lib: 'mc', name: 'calculator-variant-outline' }
};

export function SubjectIcon({ subject, selected = false, size = 22 }: { subject: string; selected?: boolean; size?: number }) {
  const icon = subjectIconMap[subject] ?? { lib: 'ion', name: 'book-outline' };
  const color = selected ? colors.white : colors.primary;
  const iconProps = { size, color };

  return (
    <View
      className="items-center justify-center"
      style={{
        height: 42,
        width: 42,
        borderRadius: radii.medium,
        backgroundColor: selected ? colors.primary : colors.primarySoft
      }}
    >
      {icon.lib === 'fa' ? <FontAwesome5 name={icon.name as ComponentProps<typeof FontAwesome5>['name']} {...iconProps} /> : null}
      {icon.lib === 'mc' ? <MaterialCommunityIcons name={icon.name as ComponentProps<typeof MaterialCommunityIcons>['name']} {...iconProps} /> : null}
      {icon.lib === 'ion' ? <Ionicons name={icon.name as ComponentProps<typeof Ionicons>['name']} {...iconProps} /> : null}
      {icon.lib === 'ad' ? <AntDesign name={icon.name as ComponentProps<typeof AntDesign>['name']} {...iconProps} /> : null}
    </View>
  );
}

export function StatTile({ icon, value, label, tint = colors.primary }: { icon: ReactNode; value: string; label: string; tint?: string }) {
  return (
    <Card className="flex-1 justify-between" style={{ minHeight: 96, padding: space.lg }}>
      <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}1A` }}>
        {icon}
      </View>
      <View>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>
          {value}
        </Text>
        <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          {label}
        </Text>
      </View>
    </Card>
  );
}
