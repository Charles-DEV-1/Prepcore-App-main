// Prepcore — Live Data & Polish
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../constants/theme';
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
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
      <Ionicons name={icon} size={48} color="#CBD5E1" />
      <Text style={{ marginTop: 14, color: '#475569', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      <Text style={{ marginTop: 8, color: '#94A3B8', fontSize: 13, lineHeight: 19, textAlign: 'center' }}>{description}</Text>
      {actionLabel && onAction ? <ActionButton className="mt-5" onPress={onAction}>{actionLabel}</ActionButton> : null}
    </View>
  );
}
