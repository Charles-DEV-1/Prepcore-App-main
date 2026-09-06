// Prepcore — Live Data & Polish
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { getAllTimeLeaderboard, getCurrentQuiz, getLeaderboard, type LeaderboardEntry } from '../src/services/weeklyQuiz';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { BrandMark, PillTabs } from '../src/components/PrepcoreUI';
import { CardSkeleton } from '../src/components/LoadingSkeleton';
import { EmptyState } from '../src/components/EmptyState';
import { colors, radii } from '../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '../src/constants/spacing';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('Weekly');

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      if (range === 'Weekly') {
        const quiz = await getCurrentQuiz();
        setEntries(quiz ? await getLeaderboard(quiz.id, user.id) : []);
      } else setEntries(await getAllTimeLeaderboard(user.id));
    } finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }, [range, user]);

  useEffect(() => { void load(); }, [load]);
  if (loading) return <View className="flex-1 bg-white p-5"><CardSkeleton count={5} /></View>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScreenScrollView className="flex-1 bg-white px-5 pt-10" style={{ backgroundColor: colors.background, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} colors={[colors.primary]} />}>
    <BrandMark size={44} />
    <View style={{ alignSelf: 'center', marginTop: space.xl, width: 240 }}><PillTabs options={['Weekly', 'All-time']} value={range} onChange={setRange} /></View>
    <Text style={{ marginTop: space.xl, textAlign: 'center', color: colors.ink, fontSize: 24, fontWeight: '700' }}>Leaderboard</Text>
    {!entries.length ? <View style={{ marginTop: space.xl }}><EmptyState icon="trophy-outline" title="No leaderboard entry yet" description={range === 'Weekly' ? "Join this week's quiz to see your rank." : 'Points will appear here as learners complete sessions.'} /></View> : <View style={{ marginTop: space.xl, gap: 10 }}>{entries.map((entry, index) => <View key={entry.user_id} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: entry.is_me ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: colors.softLine }}><Text style={{ width: 24, color: colors.textSecondary, fontSize: 14, fontWeight: '700' }}>{index + 1}</Text><View style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: entry.is_me ? colors.primary : index < 3 ? '#F59E0B' : colors.success }}><Text style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}>{entry.user_name.charAt(0)}</Text></View><View style={{ marginLeft: space.md, flex: 1 }}><Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }}>{entry.is_me ? 'You' : entry.user_name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.rank_name}</Text></View><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>{range === 'Weekly' ? `${entry.score}/${entry.total_questions}` : `${entry.score} pts`}</Text></View>)}</View>}
    {entries.find(entry => entry.is_me) ? <View style={{ marginTop: space.lg, borderRadius: radii.large, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.primarySoft }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Your rank: #{entries.findIndex(entry => entry.is_me) + 1}</Text></View> : null}
  </ScreenScrollView></SafeAreaView>;
}
