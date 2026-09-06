// Prepcore — Live Data & Polish
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors, radii } from '../constants/theme';
import { space } from '../constants/spacing';
import { ActionButton } from './PrepcoreUI';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl, borderRadius: radii.large, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine }}>
      <View style={{ height: 56, width: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ marginTop: space.lg, color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      <Text style={{ marginTop: space.sm, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{description}</Text>
      {actionLabel && onAction ? <ActionButton className="mt-5" onPress={onAction}>{actionLabel}</ActionButton> : null}
    </View>
  );
}
