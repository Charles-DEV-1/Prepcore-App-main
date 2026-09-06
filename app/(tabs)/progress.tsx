import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { getDashboardData, type DashboardData } from '../../src/services/dashboard';
import { getProgressAnalytics, type ProgressAnalytics } from '../../src/services/analytics';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { Card, PillTabs } from '../../src/components/PrepcoreUI';
import PieChart from '../../src/components/PieChart';
import { ScoreTrendChart } from '../../src/components/ScoreTrendChart';
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
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadProgress();
    return () => { mounted = false; };
  }, [track, user]);

  if (loading) return <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}><ActivityIndicator color={colors.primary} /></View>;

  const trend = analytics?.trend ?? [];
  const accuracy = analytics?.accuracy ?? [];
  const overall = analytics?.overall ?? { correct: 0, incorrect: 0, total: 0 };
  const average = trend.length ? Math.round(trend.reduce((sum, item) => sum + item.score, 0) / trend.length) : null;
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '';

  return (
    <ScreenScrollView className="flex-1 pt-12" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center justify-between"><Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Your Progress</Text><View className="flex-row items-center gap-4"><Ionicons name="search-outline" size={34} color={colors.text} /><View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}><Ionicons name="person" size={24} color={colors.primary} /></View></View></View>
      <View style={{ marginTop: space.large }}><PillTabs options={['JAMB', 'WAEC']} value={track} onChange={setTrack} /></View>

      <Card style={{ marginTop: space.medium }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}><View><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Score Trend</Text><Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>All completed sessions</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>{average === null ? '—' : `${average}%`}</Text><Text style={{ color: colors.text, fontSize: 12 }}>Average</Text></View></View>
        {trend.length ? <><View style={{ marginTop: space.md, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.muted, fontSize: 11 }}>100%</Text><Text style={{ color: colors.muted, fontSize: 11 }}>50%</Text><Text style={{ color: colors.muted, fontSize: 11 }}>0%</Text></View><ScoreTrendChart points={trend} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.muted, fontSize: 11 }}>{formatDate(trend[0]?.completedAt)}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{formatDate(trend[trend.length - 1]?.completedAt)}</Text></View></> : <Text style={{ marginTop: space.md, color: colors.muted }}>Complete sessions to see your score trend.</Text>}
      </Card>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Overall Accuracy</Text><Text style={{ marginTop: 2, color: colors.muted, fontSize: 13 }}>Every answered {track} question</Text>
        <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
          {overall.total ? <PieChart size={136} strokeWidth={26} slices={[{ label: 'Correct', value: overall.correct, color: colors.success }, { label: 'Incorrect', value: overall.incorrect, color: colors.danger }]} /> : <Text style={{ color: colors.muted }}>Complete sessions to see overall accuracy.</Text>}
          {overall.total ? <View style={{ gap: space.md }}><Legend color={colors.success} label="Correct" value={`${overall.correct} answers`} /><Legend color={colors.danger} label="Incorrect" value={`${overall.incorrect} answers`} /></View> : null}
        </View>
      </Card>

      <Card style={{ marginTop: space.medium }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Subject Accuracy Breakdown</Text>
        <View style={{ marginTop: space.large }}>{accuracy.length ? accuracy.map(({ name, accuracy: value }) => <View key={name} className="flex-row items-center" style={{ marginBottom: 12 }}><Text className="w-28 text-right" style={{ color: colors.text, fontSize: 14 }}>{name}</Text><View className="ml-4 h-4 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.primarySoft }}><View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: colors.primary }} /></View><Text className="ml-3 w-12 font-bold" style={{ color: colors.ink, fontSize: 14 }}>{value}%</Text></View>) : <Text style={{ color: colors.muted }}>Complete a practice session to see subject accuracy.</Text>}</View>
      </Card>

      <Card style={{ marginTop: space.medium }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Weak Areas</Text><Text style={{ marginTop: space.small, color: colors.text, fontSize: 14 }}>Focus on these</Text><View className="mt-4 flex-row flex-wrap gap-3">{accuracy.filter(item => item.accuracy < 60).map(item => <View key={item.name} className="flex-row items-center rounded-full px-4 py-2" style={{ backgroundColor: colors.dangerSoft }}><Text className="font-bold" style={{ color: colors.danger, fontSize: 14 }}>{item.name}</Text></View>)}</View><Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600' }}>Strong Areas</Text><View className="mt-4 flex-row flex-wrap gap-3">{accuracy.filter(item => item.accuracy > 80).map(item => <View key={item.name} className="flex-row items-center rounded-full px-4 py-2" style={{ backgroundColor: colors.successSoft }}><Text className="font-bold" style={{ color: colors.success, fontSize: 14 }}>{item.name}</Text></View>)}</View></Card>
      <Card style={{ marginTop: space.medium }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Study Streak</Text><View className="mt-4 flex-row items-end"><Text className="text-7xl font-extrabold" style={{ color: colors.text }}>{data?.streak ?? 0}</Text><Ionicons name="flame" size={58} color="#F97316" /></View><Text className="mt-2 text-2xl" style={{ color: colors.text }}>Days Streak</Text></Card>
    </ScreenScrollView>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /><View style={{ marginLeft: space.sm }}><Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{value}</Text></View></View>;
}
