// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { Card } from '../src/components/PrepcoreUI';
import { colors } from '../src/constants/theme';
import { space } from '../src/constants/spacing';

const storageKey = 'prepcore.notificationSettings';
const defaults = {
  studyReminders: true,
  streakAlerts: true,
  newQuestions: true,
  weeklyReport: true
};

const rows = [
  { key: 'studyReminders', title: 'Study Reminders', body: 'Daily reminder to practice' },
  { key: 'streakAlerts', title: 'Streak Alerts', body: 'Remind when streak about to break' },
  { key: 'newQuestions', title: 'New Questions Added', body: 'Notify when new questions added' },
  { key: 'weeklyReport', title: 'Weekly Progress Report', body: 'Summary every Sunday' }
] as const;

type NotificationSettings = typeof defaults;

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved && mounted) setSettings({ ...defaults, ...JSON.parse(saved) });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function toggle(key: keyof NotificationSettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  }

  if (loading) {
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
        <Text style={{ marginLeft: space.small, color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Notifications</Text>
      </View>

      <Card style={{ marginTop: space.large }}>
        {rows.map((row, index) => (
          <View key={row.key}>
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 14 }}>
              <View className="flex-1 pr-4">
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{row.title}</Text>
                <Text style={{ marginTop: 2, color: colors.text, fontSize: 14, fontWeight: '400', lineHeight: 21 }}>{row.body}</Text>
              </View>
              <Switch
                value={settings[row.key]}
                onValueChange={() => toggle(row.key)}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={settings[row.key] ? colors.primary : colors.white}
              />
            </View>
            {index < rows.length - 1 ? <View className="h-px" style={{ backgroundColor: colors.softLine }} /> : null}
          </View>
        ))}
      </Card>
    </ScreenScrollView>
  );
}

