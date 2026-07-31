// Prepcore — Live Data & Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { getDashboardData, type DashboardData } from '../../src/services/dashboard';
import { getProgressAnalytics, type ProgressAnalytics } from '../../src/services/analytics';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { Card, PillTabs } from '../../src/components/PrepcoreUI';
import { colors } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

export default function ProgressScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState('JAMB');
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      if (!user) return;
      setLoading(true);
      try {
        const [dashboard, progress] = await Promise.all([getDashboardData(user.id), getProgressAnalytics(user.id, track)]);
        if (mounted) { setData(dashboard); setAnalytics(progress); }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProgress();
    return () => {
      mounted = false;
    };
  }, [track, user]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const average = analytics?.trend.length ? Math.round(analytics.trend.reduce((sum, item) => sum + item.score, 0) / analytics.trend.length) : null;
  const trend = analytics?.trend ?? [];
  const accuracy = analytics?.accuracy ?? [];

  return (
    <ScreenScrollView className="flex-1 pt-12" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center justify-between">
        <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Your Progress</Text>
        <View className="flex-row items-center gap-4">
          <Ionicons name="search-outline" size={34} color={colors.text} />
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        </View>
      </View>

      <View style={{ marginTop: space.large }}>
        <PillTabs options={['JAMB', 'WAEC']} value={track} onChange={setTrack} />
      </View>

      <View style={{ marginTop: space.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.small }}>
        <View className="flex-row items-center rounded-full border" style={{ backgroundColor: colors.primarySoft, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 6 }}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text className="ml-2" style={{ color: colors.primary, fontSize: 12, lineHeight: 18 }}>Avg. Time</Text>
        </View>
        <View className="flex-row items-center rounded-full border" style={{ backgroundColor: colors.primarySoft, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 6 }}>
          <Ionicons name="book-outline" size={16} color={colors.primary} />
          <Text className="ml-2" style={{ color: colors.primary, fontSize: 12, lineHeight: 18 }}>Total Questions</Text>
        </View>
      </View>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Score Trend (Last 7 Sessions)</Text>
        <View style={{ marginTop: space.large, height: 224, flexDirection: 'row' }}>
          <View className="justify-between pb-8">
            {[100, 75, 50, 25, 0].map(label => (
              <Text key={label} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{label}</Text>
            ))}
          </View>
          <View className="ml-3 flex-1 flex-row items-end justify-between">
            {trend.map((value, index) => (
              <View key={index} className="items-center">
                <View className="w-8 rounded-t-full" style={{ height: Math.max(value.score * 1.8, 14), backgroundColor: index === trend.length - 1 ? colors.primary : '#BFD7FF' }} />
                <Text className="mt-3" style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>{index + 1}</Text>
              </View>
            ))}
            <View className="absolute right-2 top-4 items-center">
              <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>{average === null ? '—' : `${average}%`}</Text>
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>Avg. Score</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Subject Accuracy Breakdown</Text>
        <View style={{ marginTop: space.large }}>
          {accuracy.length ? accuracy.map(({ name, accuracy: value }) => (
            <View key={name} className="flex-row items-center" style={{ marginBottom: 12 }}>
              <Text className="w-28 text-right" style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{name}</Text>
              <View className="ml-4 h-4 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.primarySoft }}>
                <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: colors.primary }} />
              </View>
              <Text className="ml-3 w-12 font-bold" style={{ color: colors.ink, fontSize: 14, lineHeight: 21 }}>{value}%</Text>
            </View>
          )) : <Text style={{ color: colors.muted }}>Complete a practice session to see subject accuracy.</Text>}
        </View>
      </Card>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Weak Areas</Text>
        <Text style={{ marginTop: space.small, color: colors.text, fontSize: 14, lineHeight: 21 }}>Focus on these</Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {accuracy.filter(item => item.accuracy < 60).map(item => (
            <View key={item.name} className="flex-row items-center rounded-full px-4 py-2" style={{ backgroundColor: colors.dangerSoft }}>
              <Text className="font-bold" style={{ color: colors.danger, fontSize: 14, lineHeight: 21 }}>{item.name}</Text>
            </View>
          ))}
        </View>

        <Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Strong Areas</Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {accuracy.filter(item => item.accuracy > 80).map(item => (
            <View key={item.name} className="flex-row items-center rounded-full px-4 py-2" style={{ backgroundColor: colors.successSoft }}>
              <Text className="font-bold" style={{ color: colors.success, fontSize: 14, lineHeight: 21 }}>{item.name}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Study Streak</Text>
        <View className="mt-4 flex-row items-end">
          <Text className="text-7xl font-extrabold" style={{ color: colors.text }}>{data?.streak ?? 0}</Text>
          <Ionicons name="flame" size={58} color="#F97316" />
        </View>
        <Text className="mt-2 text-2xl" style={{ color: colors.text }}>Days Streak</Text>
      </Card>
    </ScreenScrollView>
  );
}
