// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, ToastAndroid, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { getProfile, updateProfile } from '../src/services/profile';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { Card } from '../src/components/PrepcoreUI';
import { colors } from '../src/constants/theme';
import { space } from '../src/constants/spacing';

const goals = [
  { label: 'JAMB Only', value: 'JAMB' },
  { label: 'WAEC Only', value: 'WAEC' },
  { label: 'Both', value: 'BOTH' }
];

function showSuccess(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('Saved', message);
}

export default function ExamGoalsScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [selected, setSelected] = useState('JAMB');
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
        setSelected(profile?.exam_goals ?? profile?.exam_type ?? 'JAMB');
      } catch (err) {
        if (mounted) Alert.alert('Unable to load exam goals', err instanceof Error ? err.message : 'Please try again.');
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
      await updateProfile(user.id, { exam_goals: selected });
      showSuccess('Your exam goals have been saved.');
    } catch (err) {
      Alert.alert('Unable to save exam goals', err instanceof Error ? err.message : 'Please try again.');
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
            <Pressable key={goal.value} onPress={() => setSelected(goal.value)}>
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
  );
}

