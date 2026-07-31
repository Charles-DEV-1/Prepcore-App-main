// Prepcore - UI Polish
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, shadow } from '../constants/theme';
import { polishedCard } from '../constants/spacing';

type ButtonProps = PressableProps & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
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
        <Text className="ml-3 text-3xl font-extrabold" style={{ color: dark ? colors.white : colors.text }}>
          prepcore
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: ViewStyle }) {
  return (
    <View className={`bg-white ${className}`} style={[polishedCard, { borderWidth: 1, borderColor: colors.softLine }, style]}>
      {children}
    </View>
  );
}

export function ActionButton({ children, variant = 'primary', disabled, className = '', ...props }: ButtonProps & { className?: string }) {
  const palette = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.white },
    secondary: { bg: colors.primarySoft, border: colors.primarySoft, text: colors.primary },
    outline: { bg: colors.white, border: colors.line, text: colors.text },
    danger: { bg: colors.dangerSoft, border: colors.danger, text: colors.danger }
  }[variant];

  return (
    <Pressable
      disabled={disabled}
      className={`items-center justify-center px-5 py-4 ${className}`}
      style={{
        minHeight: 56,
        borderRadius: radii.md,
        backgroundColor: disabled ? '#CBD5E1' : palette.bg,
        borderWidth: variant === 'primary' ? 0 : 1,
        borderColor: disabled ? '#CBD5E1' : palette.border
      }}
      {...props}
    >
      <Text className="text-base font-bold" style={{ color: disabled ? colors.white : palette.text }}>
        {children}
      </Text>
    </Pressable>
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
              backgroundColor: index === active ? colors.primary : '#D8DCE3'
            }}
          >
            <Text className="font-bold" style={{ color: index === active ? colors.white : colors.muted }}>
              {index + 1}
            </Text>
          </View>
          {index < total - 1 ? <View className="mx-2 h-1 w-5 rounded-full" style={{ backgroundColor: '#D8DCE3' }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function PillTabs({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View className="flex-row rounded-2xl p-1" style={{ backgroundColor: '#ECEEF4' }}>
      {options.map(option => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className="flex-1 items-center justify-center py-3"
            style={{ borderRadius: radii.sm, backgroundColor: selected ? colors.white : 'transparent' }}
          >
            <Text className="text-base font-bold" style={{ color: selected ? colors.ink : colors.muted }}>
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
  const color = selected ? colors.white : colors.ink;
  const iconProps = { size, color };

  return (
    <View
      className="items-center justify-center"
      style={{
        height: 42,
        width: 42,
        borderRadius: 12,
        backgroundColor: selected ? 'rgba(255,255,255,0.18)' : colors.primarySoft
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
    <Card className="flex-1 justify-between" style={{ minHeight: 90 }}>
      <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}1A` }}>
        {icon}
      </View>
      <View>
        <Text className="text-2xl font-extrabold" style={{ color: colors.ink, lineHeight: 36 }}>
          {value}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: colors.text, lineHeight: 21 }}>
          {label}
        </Text>
      </View>
    </Card>
  );
}
