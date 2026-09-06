// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { getProfile, updateProfile } from '../src/services/profile';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { Card } from '../src/components/PrepcoreUI';
import { colors } from '../src/constants/theme';
import { space } from '../src/constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFeedback } from '../src/components/AnimatedFeedback';

const goals = [
  { label: 'JAMB Only', value: 'JAMB' },
  { label: 'WAEC Only', value: 'WAEC' },
  { label: 'Both', value: 'BOTH' }
];

type Goal = 'JAMB' | 'WAEC' | 'BOTH';

function goalFromProfile(value: unknown, fallback: unknown): Goal {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const normalized = values.map(item => String(item).trim().toUpperCase());
  if (normalized.includes('BOTH')) return 'BOTH';
  if (normalized.includes('JAMB') && normalized.includes('WAEC')) return 'BOTH';
  if (normalized.includes('WAEC')) return 'WAEC';
  if (normalized.includes('JAMB')) return 'JAMB';
  return String(fallback ?? 'JAMB').toUpperCase() === 'WAEC' ? 'WAEC' : 'JAMB';
}

function goalsForStorage(goal: Goal): string[] {
  // The database stores exam goal identifiers in lowercase. Keep that
  // representation here so saving a choice does not depend on display casing.
  return goal === 'BOTH' ? ['jamb', 'waec'] : [goal.toLowerCase()];
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Please try again.';
}

export default function ExamGoalsScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { showFeedback } = useAppFeedback();
  const [selected, setSelected] = useState<Goal>('JAMB');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getProfile(user.id);
        if (!mounted) return;
        setSelected(goalFromProfile(profile?.exam_goals, profile?.exam_type));
      } catch (err) {
        if (mounted) Alert.alert('Unable to load exam goals', errorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        exam_goals: goalsForStorage(selected),
        exam_type: selected === 'BOTH' ? 'jamb' : selected.toLowerCase()
      });
      showFeedback('Your exam goals have been saved.', 'success', 'bottom');
    } catch (err) {
      showFeedback(errorMessage(err), 'error', 'top');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ marginLeft: space.small, color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Exam Goals</Text>
      </View>

      <View style={{ marginTop: space.large }}>
        {goals.map(goal => {
          const active = selected === goal.value;
          return (
            <Pressable key={goal.value} onPress={() => setSelected(goal.value as Goal)}>
              <Card style={{ borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.softLine, backgroundColor: active ? colors.primarySoft : colors.white }}>
                <View className="flex-row items-center justify-between">
                  <Text style={{ color: active ? colors.primary : colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{goal.label}</Text>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={active ? colors.primary : colors.muted} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        className="items-center justify-center"
        style={{ marginTop: space.small, height: 52, borderRadius: 14, backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 24 }}>{saving ? 'Saving...' : 'Save'}</Text>
      </Pressable>
    </ScreenScrollView>
    </SafeAreaView>
  );
}
